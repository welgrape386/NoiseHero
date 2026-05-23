import joblib
import numpy as np
import librosa

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
    return model.predict(scaled)[0]