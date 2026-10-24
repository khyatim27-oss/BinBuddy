"""Train a two-class MobileNetV2 transfer-learning classifier.
Dataset layout:
dataset/train/dry_waste, dataset/train/wet_waste
dataset/val/dry_waste,   dataset/val/wet_waste
"""
import os
import tensorflow as tf

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "dataset")
MODEL_DIR = os.path.join(ROOT, "models")
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
SEED = 42

def load_split(split, shuffle):
    path = os.path.join(DATA, split)
    ds = tf.keras.utils.image_dataset_from_directory(
        path, labels="inferred", label_mode="binary",
        class_names=["dry_waste", "wet_waste"],
        image_size=IMG_SIZE, batch_size=BATCH_SIZE,
        shuffle=shuffle, seed=SEED
    )
    return ds.prefetch(tf.data.AUTOTUNE)

def main():
    train_dir = os.path.join(DATA, "train")
    val_dir = os.path.join(DATA, "val")
    for split in (train_dir, val_dir):
        for cls in ("dry_waste", "wet_waste"):
            p = os.path.join(split, cls)
            if not os.path.isdir(p) or not any(
                f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
                for f in os.listdir(p)
            ):
                raise SystemExit(
                    f"No images found in {p}. Add real labelled images to both classes before training."
                )

    train_ds = load_split("train", True)
    val_ds = load_split("val", False)
    # Pixel values are normalized inside the model.
    augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.10),
    ], name="augmentation")

    base = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3), include_top=False, weights="imagenet"
    )
    base.trainable = False

    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = augmentation(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(1, activation="sigmoid")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                  loss="binary_crossentropy", metrics=["accuracy"])

    os.makedirs(MODEL_DIR, exist_ok=True)
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=4,
                                         restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(
            os.path.join(MODEL_DIR, "waste_classifier.keras"),
            monitor="val_loss", save_best_only=True
        )
    ]
    print("Class order: dry_waste=0, wet_waste=1")
    model.fit(train_ds, validation_data=val_ds, epochs=15, callbacks=callbacks)

    # Fine-tune a small tail of the pretrained backbone at a lower learning rate.
    base.trainable = True
    for layer in base.layers[:-25]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5),
                  loss="binary_crossentropy", metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=5, callbacks=callbacks)
    model.save(os.path.join(MODEL_DIR, "waste_classifier.keras"))
    print("Saved trained model to models/waste_classifier.keras")

if __name__ == "__main__":
    main()
