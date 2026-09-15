# 🧬 Lab Test Upload Types - Complete Guide

## 📋 Available Report Types

Patient ab specific lab test reports upload kar sakta hai with these options:

---

## 🔬 Test Categories

### 1️⃣ **LH/FSH Ratio** (`lh_fsh`)
```
Icon: 🧬
Full Name: Luteinizing Hormone / Follicle Stimulating Hormone Ratio
Used For: Fertility assessment, PCOS diagnosis
Common In: Women's health screening
```

### 2️⃣ **Testosterone** (`testosterone`)
```
Icon: 💪
Full Name: Testosterone Level Test
Used For: Hormone assessment, PCOS diagnosis
Common In: Both men and women's health
```

### 3️⃣ **TSH (Thyroid)** (`tsh`)
```
Icon: 🦋
Full Name: Thyroid Stimulating Hormone
Used For: Thyroid function assessment
Common In: General health screening
```

### 4️⃣ **Ferritin (Iron)** (`ferritin`)
```
Icon: 🩸
Full Name: Ferritin Level (Iron Storage)
Used For: Anemia diagnosis, iron deficiency
Common In: General health screening
```

### 5️⃣ **Prolactin** (`prolactin`)
```
Icon: 🧪
Full Name: Prolactin Hormone Test
Used For: Fertility issues, hormone imbalance
Common In: Women's health, reproductive health
```

### 6️⃣ **Urine Protein** (`urine`)
```
Icon: 💧
Full Name: Urine Protein Test
Used For: Kidney function, pregnancy monitoring
Common In: General health, pregnancy screening
```

### 7️⃣ **Pregnancy Test** (`pregnancy_test`)
```
Icon: 🤰
Full Name: Pregnancy Test (Beta-hCG)
Used For: Pregnancy confirmation
Common In: Women's reproductive health
```

### 8️⃣ **General Report** (`general`)
```
Icon: 📄
Full Name: General Medical Report
Used For: Any other medical report
Common In: All health categories
```

---

## 📱 Upload Page UI

```
┌──────────────────────────────────────────┐
│  📤 Upload Report                        │
│  Medical Documents                       │
├──────────────────────────────────────────┤
│                                          │
│  ☁️  Click to select file                │
│  PDF, JPG, PNG, DOC (Max 10MB)          │
│                                          │
│  Report Type:                            │
│  ┌─────────────┬─────────────┐          │
│  │ 🧬 LH/FSH   │ 💪 Testost  │          │
│  │   Ratio     │   -erone    │          │
│  ├─────────────┼─────────────┤          │
│  │ 🦋 TSH      │ 🩸 Ferritin │          │
│  │ (Thyroid)   │   (Iron)    │          │
│  ├─────────────┼─────────────┤          │
│  │ 🧪 Prolactin│ 💧 Urine    │          │
│  │             │   Protein   │          │
│  ├─────────────┼─────────────┤          │
│  │ 🤰 Pregnancy│ 📄 General  │          │
│  │   Test      │   Report    │          │
│  └─────────────┴─────────────┘          │
│                                          │
│  Description:                            │
│  [________________________________]      │
│                                          │
│  [ Upload to Kiosk Database ]           │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🧪 Use Cases by Test Type

### **LH/FSH Ratio**
**When to Upload:**
- PCOS screening
- Fertility assessment
- Hormone imbalance diagnosis

**Typical Values:**
- Normal: 1:1 to 2:1
- PCOS: >2:1 or >3:1

---

### **Testosterone**
**When to Upload:**
- PCOS diagnosis
- Hirsutism evaluation
- Hormone therapy monitoring

**Typical Values:**
- Women: 15-70 ng/dL
- Men: 300-1000 ng/dL

---

### **TSH (Thyroid)**
**When to Upload:**
- Thyroid function check
- Fatigue/weight issues
- Routine health screening

**Typical Values:**
- Normal: 0.4-4.0 mIU/L
- Hypothyroid: >4.0
- Hyperthyroid: <0.4

---

### **Ferritin (Iron)**
**When to Upload:**
- Anemia screening
- Iron deficiency check
- Chronic fatigue investigation

**Typical Values:**
- Women: 12-150 ng/mL
- Men: 12-300 ng/mL

---

### **Prolactin**
**When to Upload:**
- Fertility issues
- Irregular periods
- Pituitary gland function

**Typical Values:**
- Non-pregnant women: <25 ng/mL
- Men: <15 ng/mL

---

### **Urine Protein**
**When to Upload:**
- Kidney function test
- Pregnancy monitoring
- Diabetes complications

**Typical Values:**
- Normal: <150 mg/day
- Abnormal: >150 mg/day

---

### **Pregnancy Test**
**When to Upload:**
- Pregnancy confirmation
- Beta-hCG monitoring
- Early pregnancy care

**Typical Values:**
- Not pregnant: <5 mIU/mL
- Pregnant: >25 mIU/mL

---

## 🔄 Complete Flow

### Patient Perspective:

```
1. Patient goes for lab test
   └─ Gets LH/FSH report (PDF)

2. Opens Lovable App
   └─ Goes to "Upload Report"

3. Selects file
   └─ blood_test_lh_fsh.pdf

4. Selects report type
   └─ 🧬 LH/FSH Ratio

5. Adds description
   └─ "LH/FSH test from City Hospital"

6. Uploads
   └─ Saves to Kiosk database

7. Later at Kiosk
   └─ Kiosk shows uploaded LH/FSH report
   └─ AI analyzes for PCOS indicators
```

---

### Kiosk Perspective:

```python
# Kiosk conversation checks uploads
uploads = get_patient_uploads(patient_id)

for upload in uploads:
    if upload['report_type'] == 'lh_fsh':
        print("📊 LH/FSH Ratio report found")
        # Analyze for PCOS
        analyze_lh_fsh_ratio(upload['file_path'])
    
    elif upload['report_type'] == 'testosterone':
        print("📊 Testosterone report found")
        # Check for elevated levels
        check_testosterone_levels(upload['file_path'])
    
    elif upload['report_type'] == 'tsh':
        print("📊 TSH report found")
        # Check thyroid function
        analyze_thyroid_function(upload['file_path'])
    
    # ... etc for other types
```

---

## 📊 Database Storage

```sql
CREATE TABLE report_uploads (
    upload_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    
    -- Report type from specific options
    report_type VARCHAR(50) NOT NULL,  -- 'lh_fsh', 'testosterone', etc.
    
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Example records:
INSERT INTO report_uploads VALUES (
    1, 1, 
    'patient_1_20240115.pdf', 
    'lh_fsh_test.pdf',
    '/uploads/reports/patient_1_20240115.pdf',
    256000,
    'application/pdf',
    'lh_fsh',  -- Specific test type
    'LH/FSH ratio test from City Hospital',
    '2024-01-15 10:00:00'
);
```

---

## 🎯 Smart Kiosk Integration

### Automatic Test Recognition:

```python
def process_uploaded_reports(patient_id):
    """
    Kiosk automatically categorizes and analyzes reports
    """
    uploads = get_uploads(patient_id)
    
    analysis = {
        'hormone_tests': [],
        'thyroid_tests': [],
        'pregnancy_tests': [],
        'general_health': []
    }
    
    for upload in uploads:
        report_type = upload['report_type']
        
        # Hormone-related tests
        if report_type in ['lh_fsh', 'testosterone', 'prolactin']:
            analysis['hormone_tests'].append(upload)
            
        # Thyroid tests
        elif report_type == 'tsh':
            analysis['thyroid_tests'].append(upload)
            
        # Pregnancy-related
        elif report_type == 'pregnancy_test':
            analysis['pregnancy_tests'].append(upload)
            
        # Other tests
        elif report_type in ['ferritin', 'urine']:
            analysis['general_health'].append(upload)
    
    return analysis

# Usage in conversation:
analysis = process_uploaded_reports(patient_id)

if len(analysis['hormone_tests']) > 0:
    print("📊 I found your hormone test reports:")
    print("   - LH/FSH, Testosterone, Prolactin")
    print("   Would you like me to analyze these for PCOS indicators?")
```

---

## ✅ Summary

### Report Types Added:
- ✅ LH/FSH Ratio (🧬)
- ✅ Testosterone (💪)
- ✅ TSH/Thyroid (🦋)
- ✅ Ferritin/Iron (🩸)
- ✅ Prolactin (🧪)
- ✅ Urine Protein (💧)
- ✅ Pregnancy Test (🤰)
- ✅ General Report (📄)

### Features:
- ✅ 8 specific test types
- ✅ Color-coded badges
- ✅ Emoji indicators
- ✅ Grid layout (2 columns)
- ✅ Mobile responsive
- ✅ Kiosk integration ready

---

## 🧪 Test Karo:

```bash
# 1. Login
http://localhost:8080/login
Phone: 9999999999
OTP: 123456

# 2. Upload specific test
http://localhost:8080/upload-file
Select: LH/FSH Ratio report
Upload: PDF file

# 3. View uploads
http://localhost:8080/my-uploads
See: 🧬 LH/FSH Ratio badge

# 4. Kiosk checks
GET /api/v2/uploads/my-uploads
Response: report_type = "lh_fsh"
```

---

**All 8 lab test types ready! 🧬💪🦋🩸🧪💧🤰📄**
