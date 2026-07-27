# -*- coding: utf-8 -*-
from collections import defaultdict
from pathlib import Path

import joblib
import numpy as np
import librosa

MODEL_DIR = Path(__file__).resolve().parent

# 예측 라벨(primary_source) -> noise_type(법적 기준 조회용, 2-class 그대로 유지)
NOISE_TYPE_BY_SOURCE = {
    "뛰거나 걷는소리": "직접충격",
    "가구 끄는 소리": "직접충격",
    "문 닫는 소리": "직접충격",
    "망치질 소리": "직접충격",
    "TV·음향기기 소리": "공기전달",
    "피아노 소리": "공기전달",
}

LEGAL_STANDARD = {
    "직접충격": {"주간_leq": 39, "주간_lmax": 57, "야간_leq": 34, "야간_lmax": 52},
    "공기전달": {"주간_leq": 45, "야간_leq": 40},
}

# 주소음원/부소음원 판별용 이벤트 분할 설정 (고정 길이 대신 무음 구간 기준으로 자연스러운
# 소리 덩어리 단위로 나눔 -> 학습 데이터를 만들 때와 같은 방식이라 모델이 보던 형태와 일치)
SPLIT_TOP_DB = 45
MIN_EVENT_SEC = 0.3
MERGE_GAP_SEC = 0.5  # 이 간격 이내로 붙어있는 소리 조각은 하나의 이벤트로 합침
MAX_EVENT_SEC = 15.0  # 너무 길게 이어지면(연속음) 이 길이로 잘라서 특성이 다시 흐려지지 않게 함
SECONDARY_MIN_RATIO = 0.2  # 2번째로 많은 구간이 전체의 20% 이상이어야 부소음원으로 인정
SILENCE_REL_DB = 45  # baseline_db가 없을 때(fallback): 제일 큰 구간보다 이 값(dB)만큼
                     # 조용하면 정적으로 간주해 분류 대상에서 제외

# baseline_db(사용자 마이크 보정값, 실제 dB SPL)가 있을 때 절대 기준으로 정적을 판정하기 위한 값.
# 프론트엔드 CalibrationPage.tsx의 MicrophoneAnalyzer와 동일한 공식/오프셋으로 맞춤
# (rms = sqrt(mean(sample^2)), db = 20*log10(rms) + 94, autoGainControl 꺼진 원본 샘플 기준).
DBFS_TO_SPL_OFFSET = 94
BASELINE_MARGIN_DB = 3  # baseline보다 이만큼(dB) 위여야 "실제 소리"로 인정 (그 이하는 배경소음)


def _compute_features(y, sr):
    """train.py의 _compute_features와 반드시 동일해야 함 (32개 특성).
    ZCR(평균/표준편차)은 클래스 구분력이 거의 없다고 진단되어 제외."""
    rms = librosa.feature.rms(y=y)[0]
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.array(tempo).flatten()[0])
    onset_count = float(len(librosa.onset.onset_detect(y=y, sr=sr)))

    mfcc_mean = [float(x) for x in np.mean(mfcc, axis=1)]
    mfcc_std = [float(x) for x in np.std(mfcc, axis=1)]

    return mfcc_mean + mfcc_std + [
        float(np.mean(rms)), float(np.std(rms)),
        float(np.mean(spectral_centroid)),
        float(np.mean(spectral_rolloff)),
        tempo, onset_count,
    ]


def extract_features(filename):
    y, sr = librosa.load(filename)
    return _compute_features(y, sr)


def _split_windows(y, sr, top_db=SPLIT_TOP_DB, min_event_sec=MIN_EVENT_SEC,
                   merge_gap_sec=MERGE_GAP_SEC, max_event_sec=MAX_EVENT_SEC):
    """무음 구간 기준으로 나누고, 가까이 붙은 조각은 하나의 이벤트로 합친다.
    너무 길게 이어지는 연속음은 max_event_sec 단위로 다시 잘라 특성이 흐려지지 않게 한다."""
    intervals = librosa.effects.split(y, top_db=top_db)
    if len(intervals) == 0:
        return [y]

    merged = [list(intervals[0])]
    for start, end in intervals[1:]:
        gap = (start - merged[-1][1]) / sr
        if gap <= merge_gap_sec:
            merged[-1][1] = end
        else:
            merged.append([start, end])

    max_len = int(max_event_sec * sr)
    windows = []
    for start, end in merged:
        if (end - start) / sr < min_event_sec:
            continue
        pos = start
        while pos < end:
            chunk_end = min(pos + max_len, end)
            windows.append(y[pos:chunk_end])
            pos = chunk_end
    return windows or [y]


def _is_silent_window(rms, ref_rms, baseline_db):
    """baseline_db(절대 기준)가 있으면 그걸로, 없으면 클립 자체 최대치 대비 상대 기준으로 판정."""
    if baseline_db is not None:
        estimated_db = 20 * np.log10(max(rms, 1e-9)) + DBFS_TO_SPL_OFFSET
        return estimated_db < baseline_db + BASELINE_MARGIN_DB

    if ref_rms <= 1e-9:
        return True
    db = 20 * np.log10(max(rms, 1e-9) / ref_rms)
    return db < -SILENCE_REL_DB


def classify(filename, model_path=None, scaler_path=None, baseline_db=None):
    """녹음 전체를 구간별로 나눠서, 정적/배경음 구간은 건너뛰고 실제 소리가 난
    구간만 각각 분류한다. 구간을 제일 많이 차지한 소리를 주소음원으로, 그다음으로
    많이 차지한 소리가 일정 비율 이상이면 부소음원으로 판별한다.

    baseline_db: 사용자 마이크 보정값(실제 dB). 주어지면 절대 기준으로 정적을 판정하고,
    없으면(None) 기존 방식(클립 자체 최대치 대비 상대 기준)을 그대로 사용한다."""
    model_path = model_path or MODEL_DIR / "svm_model.pkl"
    scaler_path = scaler_path or MODEL_DIR / "scaler.pkl"

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    y, sr = librosa.load(filename)
    windows = _split_windows(y, sr)

    window_rms = [float(np.mean(librosa.feature.rms(y=w)[0])) for w in windows]
    ref_rms = max(window_rms) if window_rms else 0.0

    duration_by_source = defaultdict(float)
    for window, rms in zip(windows, window_rms):
        if _is_silent_window(rms, ref_rms, baseline_db):
            continue  # 정적/배경음 구간은 분류 대상에서 제외

        features = _compute_features(window, sr)
        scaled = scaler.transform([features])
        pred = model.predict(scaled)[0]
        duration_by_source[pred] += len(window) / sr

    if not duration_by_source:
        # 전부 정적으로 판정된 예외 상황 -> 원래 신호 그대로 한 번 분류해서 fallback
        features = _compute_features(y, sr)
        scaled = scaler.transform([features])
        duration_by_source[model.predict(scaled)[0]] += len(y) / sr

    ranked = sorted(duration_by_source.items(), key=lambda kv: kv[1], reverse=True)
    total_dur = sum(d for _, d in ranked)
    primary_source = ranked[0][0]

    # 주소음원 하나만 빼고, 일정 비율 이상 감지된 나머지는 전부 부소음원(복수)으로 반환
    secondary_sources = [
        src for src, dur in ranked[1:]
        if dur / total_dur >= SECONDARY_MIN_RATIO
    ]

    noise_type = NOISE_TYPE_BY_SOURCE[primary_source]

    return {
        "noise_type": noise_type,
        "primary_source": primary_source,
        "secondary_source": secondary_sources,
        "description": primary_source,
        "legal_standard": LEGAL_STANDARD[noise_type],
        "source_breakdown": {src: round(dur, 2) for src, dur in ranked},
    }
