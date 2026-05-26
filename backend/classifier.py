import joblib
import numpy as np
import librosa
import json

def extract_features(filename):
    y, sr = librosa.load(filename)
    rms = float(np.mean(librosa.feature.rms(y=y)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y)))
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = [float(x) for x in np.mean(mfcc, axis=1)]
    spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    spectral_rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.array(tempo).flatten()[0])
    return mfcc_mean + [rms, zcr, spectral_centroid, spectral_rolloff, tempo]

def classify(filename, model_path="svm_model.pkl", scaler_path="scaler.pkl"):
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    features = extract_features(filename)
    scaled = scaler.transform([features])
    result = model.predict(scaled)[0]

    if result == "직접충격음":
        return {
            "noise_type": "직접충격",
            "description": "발소리, 뛰는 소리, 가구 끄는 소리",
            "legal_standard": {
                "주간_leq": 39,
                "주간_lmax": 57,
                "야간_leq": 34,
                "야간_lmax": 52
            }
        }
    else:
        return {
            "noise_type": "공기전달",
            "description": "TV 소리, 음향기기, 악기 소리",
            "legal_standard": {
                "주간_leq": 45,
                "야간_leq": 40
            }
        }