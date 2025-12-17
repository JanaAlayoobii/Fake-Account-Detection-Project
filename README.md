# Intelligent Fake Account Detection System

This repository contains the implementation of a lightweight fake account detection system developed for the **CS3081 – Artificial Intelligence** course at **Effat University**.

The system detects likely fake Instagram accounts using **machine learning** and **publicly available profile metadata**, and provides **real-time predictions** through a Chrome extension connected to a local Flask backend.

---

## Project Overview

Fake social media accounts undermine user trust, platform security, and information integrity. This project presents a metadata-based machine learning approach that classifies Instagram accounts as **likely real or fake** without relying on platform APIs.

A trained **Random Forest classifier** is deployed locally and integrated with a Chrome extension that extracts profile metadata directly from Instagram pages. Predictions are generated in real time and displayed visually within the browser.

---

## Included Files

### Machine Learning & Backend
- **`app.py`**  
  Flask application that loads the trained machine learning model and exposes a `/predict` endpoint for inference.

- **`fake_detector.pkl`**  
  Serialized Random Forest model used for fake account classification.

- **`Classification - Instagram Fake Users.ipynb`**  
  Jupyter Notebook used for data preprocessing, feature engineering, model training, and evaluation.

---

### Chrome Extension (Manifest V3)
- **`manifest.json`**  
  Chrome extension configuration file defining permissions, scripts, and runtime behavior.

- **`content.js`**  
  Content script injected into Instagram profile pages.  
  It extracts profile metadata, performs feature normalization, and sends features for prediction.

- **`background.js`**  
  Background service worker that communicates with the local Flask server and returns prediction results to the content script.

---

## How the System Works

1. The Chrome extension detects when an Instagram profile page is loaded.
2. Profile metadata is extracted directly from the page DOM.
3. Features are normalized using the same statistics applied during training.
4. The feature vector is sent to a local Flask server.
5. The trained Random Forest model predicts the probability that the account is fake.
6. The result is displayed on the page as a visual badge (**Likely Real / Likely Fake**).

All inference is performed **locally**, preserving user privacy and eliminating dependency on external APIs.

---

## Model Performance

The deployed model achieved strong and balanced performance:

- **Accuracy:** 91.4%  
- **Precision / Recall / F1-score:** 0.914  
- **ROC AUC:** 0.978  

The confusion matrix showed symmetric classification behavior across real and fake accounts.

---

## How to Run

### 1. Start the Flask Backend
1. Ensure Python 3 is installed.
2. Install required dependencies:
   ```bash
   pip install flask numpy scikit-learn joblib
Place fake_detector.pkl in the same directory as app.py.

Run the Flask server:

python app.py


The server will run at:

http://127.0.0.1:5000

2. Load the Chrome Extension

Open Google Chrome and go to:

chrome://extensions/


Enable Developer mode (top-right).

Click Load unpacked.

Select the folder containing:

manifest.json

content.js

background.js

The extension will be loaded locally.

3. Use the System

Ensure the Flask server is running.

Open an Instagram profile page in Chrome.

The extension automatically analyzes the account.

A badge appears showing:

Likely Real or Likely Fake

A confidence percentage

No data is sent to external servers.

Authors

Jana Alayoobi

Leen Dalloul

Course: CS3081 – Artificial Intelligence
Instructor: Dr. Passent ElKafrawy
Institution: Effat University
