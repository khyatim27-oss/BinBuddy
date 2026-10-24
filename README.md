# BinBuddy
BinBuddy — AI waste segregation prototype
This is a local Flask web app that accepts a photo, predicts dry waste or wet waste with a trained TensorFlow model, asks the user to confirm/correct the prediction, and stores the verified record in SQLite. Dashboard totals are calculated from the database.
Important: the trained model is not included
A real trained model cannot be honestly supplied without a labelled wet/dry dataset and training run. The folder models/ starts empty. Follow the steps below to train models/waste_classifier.keras on your own labelled photos. Until training finishes, the app will say the model is not trained; it will not invent predictions.
Requirements
- Windows 10/11
- Python 3.11 (recommended)
- Internet for the first installation and MobileNetV2 pretrained-weight download
- About 100+ varied photos per class to start experimenting; more varied, correctly labelled images are better. This is a prototype, not a production safety system.
1. Open the project in VS Code
Extract the project folder, then VS Code → File → Open Folder → select BinBuddy_Project.
2. Open the VS Code terminal
Menu: Terminal → New Terminal. Make sure the terminal path is the project folder containing app.py.
3. Create and activate a virtual environment
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
If PowerShell blocks activation, run this once in the same terminal:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
If py -3.11 is not recognized, install Python 3.11 from https://www.python.org/downloads/ and select “Add Python to PATH” during installation.
4. Install packages
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
TensorFlow installation can take several minutes.
5. Add labelled images
Put real image files into these folders:
- dataset/train/dry_waste/
- dataset/train/wet_waste/
- dataset/val/dry_waste/
- dataset/val/wet_waste/
- dataset/test/dry_waste/
- dataset/test/wet_waste/
Use separate images in each split; do not put the same photo in both training and test folders. Start with about 70% train, 15% validation, 15% test. dry_waste: clean paper, cardboard, plastic bottles, metal cans. wet_waste: fruit peels, vegetable scraps, food scraps. Follow your local waste rules. Avoid photos where the category is ambiguous. A public dry-material dataset alone does not provide genuine wet-waste samples.
6. Train the model
With the virtual environment activated:
python train.py
This downloads ImageNet MobileNetV2 weights the first time and saves:
models/waste_classifier.keras
Training time depends on laptop hardware and dataset size. Do not claim accuracy until you run evaluation.
7. Evaluate it on the held-out test set
python evaluate.py
The report prints accuracy, precision, recall, F1-score and confusion matrix and saves evaluation/metrics.json. Use these actual results in your project report. Do not use the training accuracy as test accuracy.
8. Run the website
python app.py
Open http://127.0.0.1:5000 in your browser.
- / — home
- /classify — upload and predict
- /dashboard — confirmed records and history
- /health — check if the model file exists
Keep the terminal open while using the website. Press Ctrl+C to stop the server.
Troubleshooting
- Model not trained yet: complete steps 5 and 6; check that models/waste_classifier.keras exists.
- No images found: check folder spelling and ensure each train/val class folder has supported image files.
- TensorFlow install fails: use Python 3.13 64-bit and recreate the virtual environment.
- Dashboard is empty: upload an image and submit the confirmation form. Predictions alone are not saved until you confirm.
- Low accuracy: collect more varied, correctly labelled images; ensure wet and dry images are both present; check for duplicate photos across splits; inspect the confusion matrix.
Current limitations
- Two classes only (wet/dry); recyclable types are not distinguished individually.
- Confidence is a model score, not proof that a prediction is correct.
- The model is a student prototype and should not be used for hazardous-waste decisions.
- Image uploads remain in uploads/; this is a local demo, not a secured production deployment.
