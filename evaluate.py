"""Evaluate the trained model on held-out test images and save a report."""
import os
import json
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(ROOT, "models", "waste_classifier.keras")
TEST_DIR = os.path.join(ROOT, "dataset", "test")
OUT_DIR = os.path.join(ROOT, "evaluation")
IMG_SIZE = (224, 224)
CLASSES = ["dry_waste", "wet_waste"]

def main():
    if not os.path.exists(MODEL):
        raise SystemExit("Trained model not found. Run python train.py first.")
    ds = tf.keras.utils.image_dataset_from_directory(
        TEST_DIR, labels="inferred", label_mode="binary",
        class_names=CLASSES, image_size=IMG_SIZE, batch_size=16, shuffle=False
    )
    model = tf.keras.models.load_model(MODEL)
    y_true, y_prob = [], []
    for images, labels in ds:
        probs = model.predict(images, verbose=0).reshape(-1)
        y_prob.extend(probs.tolist())
        y_true.extend(labels.numpy().reshape(-1).astype(int).tolist())
    y_pred = (np.array(y_prob) >= 0.5).astype(int)
    report = classification_report(y_true, y_pred, target_names=CLASSES,
                                   output_dict=True, zero_division=0)
    result = {
        "test_images": len(y_true),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "class_order": CLASSES,
        "confusion_matrix_rows_true_cols_pred": confusion_matrix(y_true, y_pred).tolist(),
        "classification_report": report
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "metrics.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))
    print(f"\nSaved report to {out}")

if __name__ == "__main__":
    main()
