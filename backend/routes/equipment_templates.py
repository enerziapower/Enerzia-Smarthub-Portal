"""
Equipment Service Templates
Defines standard checklist items and test configurations for each equipment type
Used for AMC reports and individual equipment service reports
"""

# ==================== ACB (Air Circuit Breaker) ====================
ACB_TEMPLATE = {
    "equipment_type": "acb",
    "title": "AIR CIRCUIT BREAKER TEST",
    "report_type": "Site Acceptance Test Report",
    
    # Section 1: Name Plate Data
    "equipment_fields": [
        {"name": "switchgear", "label": "Switchgear", "type": "text"},
        {"name": "feeder_reference", "label": "Feeder Reference / Device", "type": "text"},
        {"name": "make_type", "label": "Make / Type", "type": "text"},
        {"name": "rated_current", "label": "Rated Current", "type": "text", "unit": "A"},
        {"name": "rated_voltage", "label": "Rated Voltage", "type": "text", "unit": "V"},
        {"name": "serial_number", "label": "Serial Number", "type": "text"},
        {"name": "control_voltage", "label": "Control Voltage", "type": "text", "unit": "V"},
        {"name": "spring_charge_motor_voltage", "label": "Spring Charge Motor Voltage", "type": "text", "unit": "V"},
        {"name": "rated_breaking_capacity", "label": "Rated Breaking Capacity", "type": "text", "unit": "kA"},
    ],
    
    # Section 2: Insulation Resistance Test
    "insulation_resistance_test": {
        "title": "Insulation Resistance Test",
        "voltage_applied": "1000V DC for 60 Sec",
        "ambient_temp_field": True,
        "cb_open": {
            "title": "CB OPEN",
            "rows": ["R-R'", "Y-Y'", "B-B'", "N-N'"]
        },
        "cb_close": {
            "title": "CB CLOSE",
            "columns": [
                {"group": "Phase to Earth", "items": ["R-E", "Y-E", "B-E", "N-E"]},
                {"group": "Phase to Phase", "items": ["R-Y", "Y-B", "B-R"]}
            ]
        },
        "acceptance_criteria": "≥1000 Ω/volt",
        "unit": "MΩ"
    },
    
    # Section 3: Coil Resistance Measurement
    "coil_resistance_test": {
        "title": "Measurement of Coil Resistance",
        "ambient_temp_field": True,
        "coils": ["CLOSE", "TRIP COIL"],
        "acceptance_criteria": "As per name plate data of coil",
        "unit": "Ω"
    },
    
    # Section 4: Contact Resistance Measurement
    "contact_resistance_test": {
        "title": "Measurement of CB Contact Resistance",
        "injected_current": "100 Amps DC",
        "phases": ["R", "Y", "B", "N"],
        "acceptance_criteria": "Not available in manual. Approx <0.1Ω",
        "unit": "μΩ"
    },
    
    # Section 5: Detailed Check List (B. DETAILED CHECK LIST)
    "checklist": [
        {"id": 1, "item": "Inspection & Checking"},
        {"id": 2, "item": "Checking visual indication & meters"},
        {"id": 3, "item": "Cleaning the contacts & arc chutes"},
        {"id": 4, "item": "Checking of tripping & trip circuit"},
        {"id": 5, "item": "Cleaning & lubricating of operating mechanisms"},
        {"id": 6, "item": "Cleaning & isolating contacts & checking for tightness"},
        {"id": 7, "item": "Cleaning, lubricating & checking operation of all inter locking devices & shutters"},
        {"id": 8, "item": "Cleaning secondary contacts & checking for tightness"},
        {"id": 9, "item": "Checking & cleaning of all the isolator"},
        {"id": 10, "item": "Checking & cleaning of bus bars"},
        {"id": 11, "item": "Measuring insulation resistance between phase & earth"},
        {"id": 12, "item": "Measuring earth resistance-half"},
        {"id": 13, "item": "CB racking IN/OUT operation & interlock"}
    ],
    
    # Signature Section
    "signatures": {
        "columns": [
            {"key": "tested_by", "label": "TESTED BY", "sublabel": "(ENERZIA)"},
            {"key": "witnessed_by_client", "label": "WITNESSED BY", "sublabel": "(CLIENT ELECTRICAL)"},
            {"key": "witnessed_by_qaqc", "label": "WITNESSED BY", "sublabel": "(CLIENT QA/QC)"},
            {"key": "approved_by", "label": "WITNESSED/APPROVED BY", "sublabel": "(CONSULTANT)"}
        ],
        "rows": ["Signature", "Name", "Date"]
    }
}

# ==================== MCCB (Moulded Case Circuit Breaker) ====================
MCCB_TEMPLATE = {
    "equipment_type": "mccb",
    "title": "MCCB SERVICE REPORT",
    "equipment_fields": [
        {"name": "feeder_name", "label": "Feeder Name", "type": "text"},
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "type_model", "label": "Type / Model", "type": "text"},
        {"name": "serial_no", "label": "Serial No.", "type": "text"},
        {"name": "poles", "label": "Pole", "type": "select", "options": ["2P", "3P", "4P"]},
        {"name": "rated_current", "label": "Rated Current (A)", "type": "text"},
        {"name": "breaking_capacity", "label": "Breaking Capacity (kA)", "type": "text"},
        {"name": "frame_size", "label": "Frame Size", "type": "text"},
    ],
    "bulk_entry": True,  # MCCB supports bulk entry for multiple feeders
    
    # Section 1: Detailed Check List (same as ACB)
    "checklist": [
        {"id": 1, "item": "Inspection & Checking"},
        {"id": 2, "item": "Checking visual indication & meters"},
        {"id": 3, "item": "Cleaning the contacts & arc chutes"},
        {"id": 4, "item": "Checking of tripping & trip circuit"},
        {"id": 5, "item": "Cleaning & lubricating of operating mechanisms"},
        {"id": 6, "item": "Cleaning & isolating contacts & checking for tightness"},
        {"id": 7, "item": "Cleaning, lubricating & checking operation of all inter locking devices & shutters"},
        {"id": 8, "item": "Cleaning secondary contacts & checking for tightness"},
        {"id": 9, "item": "Checking & cleaning of all the isolator"},
        {"id": 10, "item": "Checking & cleaning of bus bars"},
        {"id": 11, "item": "Measuring insulation resistance between phase & earth"},
        {"id": 12, "item": "Measuring earth resistance-half"},
        {"id": 13, "item": "CB racking IN/OUT operation & interlock"}
    ],
    
    # Section 2: Insulation Resistance Test (same as ACB)
    "insulation_resistance_test": {
        "title": "Insulation Resistance Test",
        "voltage_applied": "500V DC for 60 Sec",
        "ambient_temp": "",
        "acceptance_criteria": "Should be minimum 1 MΩ",
        "unit": "MΩ",
        "tables": [
            {
                "title": "CB OPEN",
                "columns": ["R-R'", "Y-Y'", "B-B'", "N-N'"]
            },
            {
                "title": "CB CLOSE - Phase to Earth",
                "columns": ["R-E", "Y-E", "B-E", "N-E"]
            },
            {
                "title": "CB CLOSE - Phase to Phase",
                "columns": ["R-Y", "Y-B", "B-R"]
            }
        ]
    },
    
    # Section 3: Coil Resistance Test (simplified for MCCB)
    "coil_resistance_test": {
        "title": "Measurement of Coil Resistance",
        "unit": "Ω",
        "acceptance_criteria": "As per manufacturer specifications"
    },
    
    # Section 4: Contact Resistance Test (same as ACB)
    "contact_resistance_test": {
        "title": "Measurement of CB Contact Resistance",
        "injected_current": "100 Amps DC",
        "phases": ["R", "Y", "B", "N"],
        "acceptance_criteria": "Not available in manual. Approx <0.1Ω",
        "unit": "μΩ"
    },
    
    # Signature Section
    "signatures": {
        "columns": [
            {"key": "tested_by", "label": "TESTED BY", "sublabel": "(ENERZIA)"},
            {"key": "witnessed_by_client", "label": "WITNESSED BY", "sublabel": "(CLIENT ELECTRICAL)"},
            {"key": "witnessed_by_qaqc", "label": "WITNESSED BY", "sublabel": "(CLIENT QA/QC)"},
            {"key": "approved_by", "label": "WITNESSED/APPROVED BY", "sublabel": "(CONSULTANT)"}
        ],
        "rows": ["Signature", "Name", "Date"]
    }
}

# ==================== VCB (Vacuum Circuit Breaker) ====================
VCB_TEMPLATE = {
    "equipment_type": "vcb",
    "title": "VCB SERVICE REPORT",
    
    # Equipment Details - includes No. of Poles and Frequency(Hz)
    "equipment_fields": [
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "type_model", "label": "Type / Model", "type": "text"},
        {"name": "serial_no", "label": "Serial No.", "type": "text"},
        {"name": "feeder_name", "label": "Feeder Name", "type": "text"},
        {"name": "rated_voltage", "label": "Rated Voltage (kV)", "type": "text", "default": "11"},
        {"name": "rated_current", "label": "Rated Current (A)", "type": "text"},
        {"name": "breaking_capacity", "label": "Breaking Capacity (kA)", "type": "text"},
        {"name": "frequency", "label": "Frequency (Hz)", "type": "text", "default": "50"},
        {"name": "no_of_poles", "label": "No. of Poles", "type": "select", "options": ["3P", "4P"]},
        {"name": "date_of_testing", "label": "Date of Testing", "type": "date"},
        {"name": "date_of_energization", "label": "Date of Energization", "type": "date"},
        {"name": "next_due_date", "label": "Next Due Date", "type": "date"},
    ],
    
    # Section 1: Service Checks
    "service_checks": {
        "title": "Service Checks",
        "items": [
            {"id": "spring_motor_resistance", "label": "Spring Charging Motor Resistance", "fields": ["voltage", "resistance"], "unit_voltage": "V.AC", "unit_resistance": "Ohm"},
            {"id": "closing_coil", "label": "Closing Coil Voltage and Resistance", "fields": ["voltage", "resistance"], "unit_voltage": "V.DC", "unit_resistance": "Ohm"},
            {"id": "tripping_coil", "label": "Tripping Coil Voltage and Resistance", "fields": ["voltage", "resistance"], "unit_voltage": "V.DC", "unit_resistance": "Ohm"},
            {"id": "counter_reading", "label": "Counter Reading/Anti pumping(K1)", "fields": ["value"], "type": "number"},
            {"id": "visual_inspection", "label": "Visual Inspection for Damage", "fields": ["observation"], "type": "text"},
            {"id": "replacement", "label": "Replacement", "fields": ["details"], "type": "text"},
            {"id": "thorough_cleaning", "label": "Thorough Cleaning", "fields": ["observation"], "type": "text"},
            {"id": "lubrication", "label": "Lubrication of Moving Parts/Coil", "fields": ["observation"], "type": "text"},
        ]
    },
    
    # Section 2: Contact Resistance Test
    "contact_resistance_test": {
        "title": "Contact Resistance Test",
        "phases": ["R", "Y", "B"],
        "fields": ["resistance_measured", "current_injected"],
        "unit_resistance": "micro Ohms",
        "unit_current": "A.DC",
        "acceptance_criteria": "As per manufacturer specifications"
    },
    
    # Section 3: Insulation Resistance Test
    "insulation_resistance_test": {
        "title": "Insulation Resistance Test",
        "phases": ["R", "Y", "B"],
        "breaker_closed": {
            "title": "Breaker in Closed Condition",
            "rows": [
                {"id": "ir_top_ground", "label": "IR Value between top to Ground"},
                {"id": "ir_phase_phase", "label": "IR Value between Phase to Phase"}
            ]
        },
        "breaker_open": {
            "title": "Breaker in Open Condition",
            "rows": [
                {"id": "ir_pole_pole", "label": "IR Value between Pole to Pole"}
            ]
        },
        "unit": "GΩ",
        "acceptance_criteria": "≥1000 MΩ"
    },
    
    # Section 4: Breaker Timings Test
    "breaker_timings_test": {
        "title": "Breaker Timings Test",
        "phases": ["R", "Y", "B"],
        "rows": [
            {"id": "closing_time", "label": "Closing Time"},
            {"id": "opening_time", "label": "Opening Time"},
            {"id": "close_open", "label": "Close-Open"}
        ],
        "unit": "milli Sec",
        "acceptance_criteria": "As per manufacturer specifications"
    },
    
    # Section 5: Operational Checks
    "operational_checks": {
        "title": "Operational Checks",
        "rows": [
            {"id": "close", "label": "Close"},
            {"id": "open", "label": "Open"}
        ],
        "columns": ["Manual", "Electrical"],
        "options": ["OK", "NOT OK", "N/A"]
    },
    
    # Section 6: Functional Checks (renamed from Service Checklist)
    "functional_checks": {
        "title": "Functional Checks",
        "items": [
            {"id": 1, "item": "Trip/Trip circuit healthy Lamp Indication"},
            {"id": 2, "item": "Limit Switch for spring charge motor"},
            {"id": 3, "item": "Test/Service Limit Switch"},
            {"id": 4, "item": "Operation Counter"},
            {"id": 5, "item": "Function of illumination socket Switch"},
            {"id": 6, "item": "Spring Charging both by manual & through motor"},
            {"id": 7, "item": "Check for completeness of Installations"},
            {"id": 8, "item": "Vacuum Checking"},
            {"id": 9, "item": "Rack In/Out Checking"},
            {"id": 10, "item": "Drive Mechanism"},
            {"id": 11, "item": "Checking CB/Door Interlock"}
        ],
        "column": "Remote",
        "options": ["Checked and Found OK", "Not Checked", "Requires Attention", "N/A"]
    },
    
    # Legacy fields for backward compatibility
    "ir_test": {
        "columns": ["R-E", "Y-E", "B-E", "R-Y", "Y-B", "B-R"],
        "rows": ["Phase to Earth", "Phase to Phase"],
        "unit": "MΩ"
    },
    "timing_test": {
        "columns": ["R", "Y", "B"],
        "rows": ["Closing Time (ms)", "Opening Time (ms)"],
    }
}

# ==================== Electrical Panel / DB ====================
PANEL_TEMPLATE = {
    "equipment_type": "panel",
    "title": "PANEL / DB SERVICE REPORT",
    "equipment_fields": [
        {"name": "panel_name", "label": "Panel Name", "type": "text"},
        {"name": "panel_type", "label": "Panel Type", "type": "select", "options": ["LT Panel", "HT Panel", "MCC", "PCC", "APFC", "DB", "MLDB", "SMDB", "Feeder Pillar"]},
        {"name": "location", "label": "Location", "type": "text"},
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "rated_voltage", "label": "Rated Voltage (V)", "type": "text"},
        {"name": "rated_current", "label": "Rated Current (A)", "type": "text"},
        {"name": "next_due_date", "label": "Next Due Date", "type": "date"},
    ],
    "panel_section_toggles": {
        "checklist": True,
        "capacitor_health": True
    },
    "points_to_ensure": {
        "title": "CHECKLIST OF LT. PANELS (PCC's, MCC, LDB, PDB, ELDB, APFCR, DB's, etc.)",
        "items": [
            {"id": 1, "item": "Check for any physical breakage / damage"},
            {"id": 2, "item": "Cubicles bolted in position"},
            {"id": 3, "item": "Position of busbars and spacing checked and found within acceptable limit"},
            {"id": 4, "item": "All the insulators are in good condition"},
            {"id": 5, "item": "Inter-changing of all size of Motor, Power and ACB Feeders checked"},
            {"id": 6, "item": "Operation of shutter mechanism checked and satisfied"},
            {
                "id": 7, 
                "item": "Panel wiring checked and found as per scheme",
                "sub_items": [
                    "Motor Feeders",
                    "Motor feeder interlock with Control Room Panels",
                    "Incomer interlocks scheme"
                ]
            },
            {"id": 8, "item": "All meters tested and CT / PT Ratio checked as per the ITP. And CT's have been put in service"},
            {"id": 9, "item": "All protection relays tested and tripping through relays checked"},
            {"id": 10, "item": "BUSBAR IR checked"},
            {
                "id": 11, 
                "item": "Auxiliary power supply made available",
                "sub_items": [
                    "DC Supply for protection & interlocks",
                    "Auxiliary supply for Space Heaters",
                    "Control Power supply"
                ]
            },
            {"id": 12, "item": "Check all the Main & Control fuses of recommended ratings"},
            {"id": 13, "item": "Check Feeder"}
        ]
    },
    "capacitor_health": {
        "title": "CAPACITOR HEALTH REPORT",
        "columns": ["S/NO", "FEEDER", "CURRENT (A) - R", "CURRENT (A) - Y", "CURRENT (A) - B", "REMARKS"],
        "default_rows": 8
    },
    "earth_resistance": {
        "label": "Earth Resistance Value",
        "unit": "Ω"
    }
}

# ==================== Relay Calibration ====================
RELAY_TEMPLATE = {
    "equipment_type": "relay",
    "title": "RELAY CALIBRATION REPORT",
    "equipment_fields": [
        {"name": "relay_type", "label": "Relay Type", "type": "select", "options": ["Overcurrent", "Earth Fault", "Differential", "Distance", "Undervoltage", "Overvoltage", "Numerical", "Electromechanical"]},
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "model", "label": "Model", "type": "text"},
        {"name": "serial_no", "label": "Serial No.", "type": "text"},
        {"name": "ct_sec", "label": "CT Sec", "type": "text"},
        {"name": "control_voltage", "label": "Control Voltage", "type": "text"},
        {"name": "associated_breaker", "label": "Associated Breaker", "type": "text"},
        {"name": "date_of_testing", "label": "Date of Testing", "type": "date"},
        {"name": "next_due_date", "label": "Next Due Date", "type": "date"},
    ],
    "settings": [
        {"parameter": "Overcurrent Setting (A)", "set_value": "", "measured_value": ""},
        {"parameter": "Time Multiplier Setting (TMS)", "set_value": "", "measured_value": ""},
        {"parameter": "Earth Fault Setting (A)", "set_value": "", "measured_value": ""},
        {"parameter": "Instantaneous Setting (A)", "set_value": "", "measured_value": ""},
    ],
    "checklist": [
        {"id": 1, "item": "Visual inspection"},
        {"id": 2, "item": "Cleaning of relay contacts"},
        {"id": 3, "item": "Checking of relay settings"},
        {"id": 4, "item": "Calibration of overcurrent element"},
        {"id": 5, "item": "Calibration of earth fault element"},
        {"id": 6, "item": "Checking of trip circuit"},
        {"id": 7, "item": "Checking of alarm circuit"},
        {"id": 8, "item": "Checking of flag indicators"},
        {"id": 9, "item": "Injection test"},
        {"id": 10, "item": "Functional test with breaker"},
    ]
}

# ==================== APFC Panel ====================
APFC_TEMPLATE = {
    "equipment_type": "apfc",
    "title": "APFC PANEL SERVICE REPORT",
    "equipment_fields": [
        {"name": "panel_name", "label": "Panel Name", "type": "text"},
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "total_kvar", "label": "Total KVAR", "type": "text"},
        {"name": "no_of_stages", "label": "No. of Stages", "type": "number"},
        {"name": "controller_make", "label": "Controller Make", "type": "text"},
        {"name": "controller_model", "label": "Controller Model", "type": "text"},
    ],
    "capacitor_banks": {
        "columns": ["Stage", "KVAR Rating", "Make", "Status", "Remarks"],
    },
    "checklist": [
        {"id": 1, "item": "Visual inspection of panel"},
        {"id": 2, "item": "Cleaning of capacitor banks"},
        {"id": 3, "item": "Checking of contactor contacts"},
        {"id": 4, "item": "Checking of fuse links"},
        {"id": 5, "item": "Checking of controller settings"},
        {"id": 6, "item": "Checking of target power factor setting"},
        {"id": 7, "item": "Checking of switching sequence"},
        {"id": 8, "item": "Checking of discharge resistors"},
        {"id": 9, "item": "IR value measurement of capacitors"},
        {"id": 10, "item": "Checking of ventilation fans"},
    ]
}

# ==================== Earth Pit ====================
EARTH_PIT_TEMPLATE = {
    "equipment_type": "earth_pit",
    "title": "EARTH PIT TEST REPORT",
    "testing_details": {
        "title": "Testing Details - Earth Pit",
        "fields": [
            {"name": "pit_type", "label": "Pit Type", "type": "select", "options": ["Pipe Type", "Plate Type", "Rod Type", "Chemical", "Maintenance Free"]},
            {"name": "electrode_material", "label": "Electrode Material", "type": "select", "options": ["GI Pipe", "Copper Plate", "GI Rod", "Copper Rod", "Chemical Compound"]},
            {"name": "date_of_testing", "label": "Date of Testing", "type": "date"},
            {"name": "next_due_on", "label": "Next Due On", "type": "date"},
        ]
    },
    "earth_pit_section_toggles": {
        "electrical_checks": True,
        "continuity_checks": True
    },
    "electrical_checks": {
        "title": "ELECTRICAL CHECKS",
        "columns": ["Earth Pit No", "Pit Location", "Test Method", "Test Results Ohm (Individual)", "Test Results Ohm (Combined)", "Remarks"],
        "notes": "The maximum permissible value for individual earth pit is 5 Ohms and the maximum permissible value for combined earth pit is 1 Ohm as per IS 3043:2018, IEEE Std 80-2013, and IEC 60364-5-54.",
        "default_rows": 6
    },
    "continuity_checks": {
        "title": "CONTINUITY CHECKS",
        "columns": ["FROM: EARTH PIT NO", "TO: EQUIPMENT", "CONTINUITY CHECKED", "REMARKS"],
        "default_rows": 6
    }
}

# ==================== UPS ====================
UPS_TEMPLATE = {
    "equipment_type": "ups",
    "title": "UPS SERVICE REPORT",
    "equipment_fields": [
        {"name": "ups_rating", "label": "UPS Rating (KVA)", "type": "text"},
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "model", "label": "Model", "type": "text"},
        {"name": "serial_no", "label": "Serial No.", "type": "text"},
        {"name": "battery_type", "label": "Battery Type", "type": "select", "options": ["SMF", "Tubular", "Lithium-ion"]},
        {"name": "battery_ah", "label": "Battery AH", "type": "text"},
        {"name": "no_of_batteries", "label": "No. of Batteries", "type": "number"},
    ],
    "checklist": [
        {"id": 1, "item": "Visual inspection of UPS unit"},
        {"id": 2, "item": "Cleaning of UPS and battery rack"},
        {"id": 3, "item": "Checking of input voltage"},
        {"id": 4, "item": "Checking of output voltage"},
        {"id": 5, "item": "Checking of battery voltage"},
        {"id": 6, "item": "Checking of load percentage"},
        {"id": 7, "item": "Battery backup time test"},
        {"id": 8, "item": "Checking of cooling fans"},
        {"id": 9, "item": "Checking of alarm indications"},
        {"id": 10, "item": "Tightening of battery terminals"},
        {"id": 11, "item": "Checking of battery water level (if applicable)"},
        {"id": 12, "item": "Bypass operation check"},
    ],
    "readings": {
        "columns": ["Parameter", "Reading", "Normal Range"],
        "rows": [
            {"parameter": "Input Voltage (V)", "normal": "380-420V"},
            {"parameter": "Output Voltage (V)", "normal": "400±2%"},
            {"parameter": "Battery Voltage (V)", "normal": "As per config"},
            {"parameter": "Load (%)", "normal": "< 80%"},
            {"parameter": "Backup Time (min)", "normal": "As per design"},
        ]
    }
}

# ==================== DG Set ====================
DG_TEMPLATE = {
    "equipment_type": "dg",
    "title": "DG SET SERVICE REPORT",
    "equipment_fields": [
        {"name": "dg_rating", "label": "DG Rating (KVA)", "type": "text"},
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "model", "label": "Model", "type": "text"},
        {"name": "serial_no", "label": "Serial No.", "type": "text"},
        {"name": "engine_make", "label": "Engine Make", "type": "text"},
        {"name": "engine_model", "label": "Engine Model", "type": "text"},
        {"name": "alternator_make", "label": "Alternator Make", "type": "text"},
    ],
    "checklist": [
        {"id": 1, "item": "Visual inspection of DG set"},
        {"id": 2, "item": "Checking of engine oil level"},
        {"id": 3, "item": "Checking of coolant level"},
        {"id": 4, "item": "Checking of fuel level"},
        {"id": 5, "item": "Checking of battery condition"},
        {"id": 6, "item": "Checking of air filter"},
        {"id": 7, "item": "Checking of fuel filter"},
        {"id": 8, "item": "Checking of oil filter"},
        {"id": 9, "item": "Checking of fan belt tension"},
        {"id": 10, "item": "Checking of exhaust system"},
        {"id": 11, "item": "Checking of control panel"},
        {"id": 12, "item": "Checking of AMF panel"},
        {"id": 13, "item": "Load bank test"},
        {"id": 14, "item": "Checking of earthing"},
        {"id": 15, "item": "Checking of vibration dampers"},
    ],
    "readings": {
        "columns": ["Parameter", "No Load", "Full Load", "Normal Range"],
        "rows": [
            {"parameter": "Voltage R-Y (V)", "normal": "400±5%"},
            {"parameter": "Voltage Y-B (V)", "normal": "400±5%"},
            {"parameter": "Voltage B-R (V)", "normal": "400±5%"},
            {"parameter": "Frequency (Hz)", "normal": "50±0.5"},
            {"parameter": "Oil Pressure (kg/cm²)", "normal": "3-5"},
            {"parameter": "Coolant Temp (°C)", "normal": "70-85"},
        ]
    }
}

# ==================== Lightning Arrestor ====================
LA_TEMPLATE = {
    "equipment_type": "lightning_arrestor",
    "title": "LIGHTNING ARRESTOR TEST REPORT",
    "equipment_fields": [
        {"name": "la_type", "label": "LA Type", "type": "select", "options": ["Station Class", "Distribution Class", "Secondary Class"]},
        {"name": "make", "label": "Make", "type": "text"},
        {"name": "rated_voltage", "label": "Rated Voltage (kV)", "type": "text"},
        {"name": "location", "label": "Location", "type": "text"},
    ],
    "checklist": [
        {"id": 1, "item": "Visual inspection"},
        {"id": 2, "item": "Checking of porcelain/polymer housing"},
        {"id": 3, "item": "Checking of earth connections"},
        {"id": 4, "item": "IR value measurement"},
        {"id": 5, "item": "Leakage current measurement"},
        {"id": 6, "item": "Checking of surge counter (if fitted)"},
    ],
    "test_results": [
        {"parameter": "Insulation Resistance (MΩ)", "value": "", "acceptance": "> 1000 MΩ"},
        {"parameter": "Leakage Current (µA)", "value": "", "acceptance": "< 50 µA"},
    ]
}

# ==================== Energy Meter ====================
ENERGY_METER_TEMPLATE = {
    "equipment_type": "energy_meter",
    "title": "ENERGY METER TEST REPORT",
    "equipment_details": {
        "title": "Equipment Details - Energy Meter",
        "fields": [
            {"name": "meter_name", "label": "Meter Name", "type": "text"},
            {"name": "meter_location", "label": "Meter Location", "type": "text"},
            {"name": "meter_accuracy", "label": "Meter Accuracy", "type": "select", "options": ["Class 0.2", "Class 0.5", "Class 1.0", "Class 2.0"]},
            {"name": "panel_feeder_name", "label": "Panel/Feeder Name", "type": "text"},
            {"name": "make_model", "label": "Make/Model No.", "type": "text"},
            {"name": "serial_no", "label": "Serial No.", "type": "text"},
            {"name": "ct_ratio", "label": "CT Ratio", "type": "text"},
            {"name": "pt_ratio", "label": "PT Ratio", "type": "text"},
            {"name": "system_frequency", "label": "System Frequency", "type": "select", "options": ["50 Hz", "60 Hz"]},
            {"name": "system_voltage", "label": "System Voltage", "type": "text"},
            {"name": "date_of_calibration", "label": "Date of Calibration", "type": "date"},
            {"name": "next_due_on", "label": "Next Due On", "type": "date"},
        ]
    },
    "energy_meter_section_toggles": {
        "master_standard": True,
        "test_results": True
    },
    "master_standard": {
        "title": "MASTER STANDARD DETAILS",
        "columns": ["Nomenclature", "Make/Model", "SL.NO", "Certificate No", "Validity"]
    },
    "test_results_config": {
        "title_v_i_pf_freq": "TEST RESULTS (V, I, PF & FREQ)",
        "title_kwh": "TEST RESULTS (kWH)",
        "parameters_table": {
            "columns": ["Parameters", "V (R-Y)", "V (Y-B)", "V (B-R)", "R", "Y", "B", "P.F", "Frequency Hz"],
            "rows": ["DUC Reading", "STD Reading"]
        },
        "energy_table": {
            "columns": ["", "DUC Reading in MWh", "Standard Reading in kWh", "Error in %"],
            "rows": ["Final Reading", "Initial Reading", "Difference", "MF Factor", "Total Unit"]
        }
    },
    "notes": [
        "The Standards used are traceable to National Standards"
    ]
}


# ==================== Transformer ====================
TRANSFORMER_TEMPLATE = {
    "equipment_type": "transformer",
    "title": "TRANSFORMER TEST REPORT",
    "report_type": "Site Acceptance Test Report",
    
    # Section 1: Name Plate Data
    "equipment_fields": [
        {"name": "transformer_id", "label": "Transformer ID/Tag", "type": "text"},
        {"name": "location", "label": "Location", "type": "text"},
        {"name": "make_type", "label": "Make / Type", "type": "text"},
        {"name": "serial_number", "label": "Serial Number", "type": "text"},
        {"name": "rating", "label": "Rating", "type": "text", "unit": "kVA/MVA"},
        {"name": "primary_voltage", "label": "Primary Voltage", "type": "text", "unit": "kV"},
        {"name": "secondary_voltage", "label": "Secondary Voltage", "type": "text", "unit": "V"},
        {"name": "vector_group", "label": "Vector Group", "type": "text"},
        {"name": "cooling_type", "label": "Cooling Type", "type": "select", "options": ["ONAN", "ONAF", "OFAF", "OFWF", "AN", "AF"]},
        {"name": "impedance", "label": "Impedance", "type": "text", "unit": "%"},
        {"name": "tap_positions", "label": "No. of Tap Positions", "type": "text"},
        {"name": "tap_range", "label": "Tap Range", "type": "text", "unit": "%"},
        {"name": "year_of_manufacture", "label": "Year of Manufacture", "type": "text"},
    ],
    
    # Section 2: Insulation Resistance Test
    "insulation_resistance_test": {
        "title": "Insulation Resistance Test",
        "voltage_applied": "5000V DC for 60 Sec",
        "ambient_temp_field": True,
        "tests": [
            {"name": "hv_to_lv", "label": "HV to LV"},
            {"name": "hv_to_e", "label": "HV to Earth"},
            {"name": "lv_to_e", "label": "LV to Earth"},
            {"name": "hv_lv_to_e", "label": "HV+LV to Earth"}
        ],
        "acceptance_criteria": "≥ (kV+1) x 1000 MΩ",
        "unit": "MΩ"
    },
    
    # Section 3: Winding Resistance Test
    "winding_resistance_test": {
        "title": "Winding Resistance Measurement",
        "ambient_temp_field": True,
        "hv_windings": {
            "title": "HV Winding",
            "phases": ["R-N", "Y-N", "B-N"]
        },
        "lv_windings": {
            "title": "LV Winding", 
            "phases": ["r-n", "y-n", "b-n"]
        },
        "acceptance_criteria": "Variation between phases should not exceed 2%",
        "unit": "Ω"
    },
    
    # Section 4: Ratio Test
    "ratio_test": {
        "title": "Transformation Ratio Test",
        "phases": ["R-r", "Y-y", "B-b"],
        "columns": ["Tap Position", "Measured Ratio", "Calculated Ratio", "% Error"],
        "acceptance_criteria": "Error should not exceed ±0.5% for principal tap",
        "unit": ""
    },
    
    # Section 5: Oil Tests (BDV)
    "oil_bdv_test": {
        "title": "Oil Breakdown Voltage Test (BDV)",
        "readings": 6,
        "gap": "2.5mm",
        "acceptance_criteria": "≥ 30 kV for new oil, ≥ 40 kV for in-service",
        "unit": "kV"
    },
    
    # Section 6: Magnetic Balance Test
    "magnetic_balance_test": {
        "title": "Magnetic Balance Test",
        "enabled": True,
        "phases": ["R-N", "Y-N", "B-N"],
        "acceptance_criteria": "Readings should be balanced",
        "unit": "V"
    },
    
    # Section 7: Vector Group Test
    "vector_group_test": {
        "title": "Vector Group Verification",
        "enabled": True,
        "acceptance_criteria": "Should match nameplate vector group"
    },
    
    # Section 8: OLTC Tests (if applicable)
    "oltc_tests": {
        "enabled": True,
        "title": "OLTC (On-Load Tap Changer) Tests",
        "contact_resistance": {
            "title": "OLTC Contact Resistance",
            "phases": ["R", "Y", "B"],
            "acceptance_criteria": "As per manufacturer specification",
            "unit": "mΩ"
        },
        "operation_check": {
            "title": "OLTC Operation Check",
            "items": [
                "Local operation",
                "Remote operation",
                "Auto voltage regulation",
                "Step time measurement",
                "Operation counter"
            ]
        }
    },
    
    # Section 9: Detailed Check List
    "checklist": [
        {"id": 1, "item": "Visual inspection of transformer body, bushings, and accessories"},
        {"id": 2, "item": "Check oil level in main tank and conservator"},
        {"id": 3, "item": "Check silica gel breather condition"},
        {"id": 4, "item": "Check Buchholz relay and pressure relief device"},
        {"id": 5, "item": "Check oil temperature indicator (OTI)"},
        {"id": 6, "item": "Check winding temperature indicator (WTI)"},
        {"id": 7, "item": "Check cooling fans/pumps operation"},
        {"id": 8, "item": "Check MOG (Magnetic Oil Gauge)"},
        {"id": 9, "item": "Check earthing connections"},
        {"id": 10, "item": "Check cable terminations and connections"},
        {"id": 11, "item": "Check marshalling box and wiring"},
        {"id": 12, "item": "Check OLTC operation (if applicable)"},
        {"id": 13, "item": "Check protection relay settings"},
        {"id": 14, "item": "Check alarm and trip circuits"},
    ],
    
    # Section 10: Test Equipment Used
    "test_equipment": [
        "Insulation Resistance Tester (5kV Megger)",
        "Winding Resistance Meter",
        "Turns Ratio Tester",
        "Oil BDV Test Kit",
        "CT/PT Analyzer (if applicable)"
    ],
    
    "notes": [
        "All tests performed as per IS 2026 / IEC 60076",
        "Oil samples taken as per IS 335 / IEC 60296"
    ],
    
    # Section toggles for the form
    "transformer_section_toggles": {
        "insulationResistanceTest": True,
        "windingResistanceTest": True,
        "ratioTest": True,
        "oilBdvTest": True,
        "magneticBalanceTest": True,
        "vectorGroupTest": True,
        "oltcTests": False,
        "detailedChecklist": True
    }
}


# ==================== Master Template Dictionary ====================
EQUIPMENT_TEMPLATES = {
    "acb": ACB_TEMPLATE,
    "mccb": MCCB_TEMPLATE,
    "vcb": VCB_TEMPLATE,
    "panel": PANEL_TEMPLATE,
    "electrical-panel": PANEL_TEMPLATE,  # Alias
    "relay": RELAY_TEMPLATE,
    "apfc": APFC_TEMPLATE,
    "earth_pit": EARTH_PIT_TEMPLATE,
    "earth-pit": EARTH_PIT_TEMPLATE,  # Alias
    "ups": UPS_TEMPLATE,
    "dg": DG_TEMPLATE,
    "lightning_arrestor": LA_TEMPLATE,
    "lightning-arrestor": LA_TEMPLATE,  # Alias
    "energy_meter": ENERGY_METER_TEMPLATE,
    "energy-meter": ENERGY_METER_TEMPLATE,  # Alias
    "transformer": TRANSFORMER_TEMPLATE,
}


# ==================== Voltmeter ====================
VOLTMETER_TEMPLATE = {
    "equipment_type": "voltmeter",
    "title": "VOLTMETER TEST REPORT",
    "equipment_details": {
        "title": "Equipment Details - Voltmeter",
        "fields": [
            {"name": "meter_name", "label": "Meter Name", "type": "text"},
            {"name": "meter_location", "label": "Meter Location", "type": "text"},
            {"name": "meter_accuracy", "label": "Meter Accuracy", "type": "select", "options": ["Class 0.2", "Class 0.5", "Class 1.0", "Class 2.0"]},
            {"name": "panel_feeder_name", "label": "Panel/Feeder Name", "type": "text"},
            {"name": "make_model", "label": "Make/Model No.", "type": "text"},
            {"name": "serial_no", "label": "Serial No.", "type": "text"},
            {"name": "measuring_range", "label": "Measuring Range", "type": "text"},
            {"name": "system_voltage", "label": "System Voltage", "type": "text"},
            {"name": "date_of_calibration", "label": "Date of Calibration", "type": "date"},
            {"name": "next_due_on", "label": "Next Due On", "type": "date"},
        ]
    },
    "voltmeter_section_toggles": {
        "master_standard": True,
        "test_results": True
    },
    "master_standard": {
        "title": "MASTER STANDARD DETAILS",
        "columns": ["Nomenclature", "Make/Model", "SL.NO", "Certificate No", "Validity"]
    },
    "test_results_config": {
        "title_voltage": "TEST RESULTS (Voltage)",
        "title_reading": "TEST RESULTS (Reading)",
        "parameters_table": {
            "columns": ["Parameters", "V (R-Y)", "V (Y-B)", "V (B-R)"],
            "rows": ["DUC Reading", "STD Reading"]
        },
        "reading_table": {
            "columns": ["", "DUC Reading (V)", "Standard Reading (V)", "Error in %"],
            "rows": ["Final Reading", "Initial Reading", "Difference"]
        }
    },
    "notes": [
        "The Standards used are traceable to National Standards"
    ]
}


# ==================== Ammeter ====================
AMMETER_TEMPLATE = {
    "equipment_type": "ammeter",
    "title": "AMMETER TEST REPORT",
    "equipment_details": {
        "title": "Equipment Details - Ammeter",
        "fields": [
            {"name": "meter_name", "label": "Meter Name", "type": "text"},
            {"name": "meter_location", "label": "Meter Location", "type": "text"},
            {"name": "meter_accuracy", "label": "Meter Accuracy", "type": "select", "options": ["Class 0.2", "Class 0.5", "Class 1.0", "Class 2.0"]},
            {"name": "panel_feeder_name", "label": "Panel/Feeder Name", "type": "text"},
            {"name": "make_model", "label": "Make/Model No.", "type": "text"},
            {"name": "serial_no", "label": "Serial No.", "type": "text"},
            {"name": "measuring_range", "label": "Measuring Range", "type": "text"},
            {"name": "ct_ratio", "label": "CT Ratio", "type": "text"},
            {"name": "date_of_calibration", "label": "Date of Calibration", "type": "date"},
            {"name": "next_due_on", "label": "Next Due On", "type": "date"},
        ]
    },
    "ammeter_section_toggles": {
        "master_standard": True,
        "test_results": True
    },
    "master_standard": {
        "title": "MASTER STANDARD DETAILS",
        "columns": ["Nomenclature", "Make/Model", "SL.NO", "Certificate No", "Validity"]
    },
    "test_results_config": {
        "title_current": "TEST RESULTS (Current)",
        "title_reading": "TEST RESULTS (Reading)",
        "parameters_table": {
            "columns": ["Parameters", "R", "Y", "B"],
            "rows": ["DUC Reading", "STD Reading"]
        },
        "reading_table": {
            "columns": ["", "DUC Reading (A)", "Standard Reading (A)", "Error in %"],
            "rows": ["Final Reading", "Initial Reading", "Difference"]
        }
    },
    "notes": [
        "The Standards used are traceable to National Standards"
    ]
}


# Add Voltmeter and Ammeter to EQUIPMENT_TEMPLATES
EQUIPMENT_TEMPLATES["voltmeter"] = VOLTMETER_TEMPLATE
EQUIPMENT_TEMPLATES["ammeter"] = AMMETER_TEMPLATE


# ==================== Generic/Other Template ====================
OTHER_TEMPLATE = {
    "equipment_type": "other",
    "title": "EQUIPMENT TEST REPORT",
    "report_type": "General Test Report",
    "equipment_fields": [
        {"name": "equipment_name", "label": "Equipment Name", "type": "text"},
        {"name": "equipment_id", "label": "Equipment ID/Tag", "type": "text"},
        {"name": "location", "label": "Location", "type": "text"},
        {"name": "make_type", "label": "Make / Type", "type": "text"},
        {"name": "serial_number", "label": "Serial Number", "type": "text"},
        {"name": "rating", "label": "Rating", "type": "text"},
    ],
    "checklist": [
        {"id": 1, "item": "Visual inspection"},
        {"id": 2, "item": "Functional test"},
        {"id": 3, "item": "Electrical connections check"},
        {"id": 4, "item": "Safety devices check"},
        {"id": 5, "item": "Final operational test"},
    ],
    "notes": []
}

# ==================== IR Thermography Template ====================
IR_THERMOGRAPHY_TEMPLATE = {
    "equipment_type": "ir-thermography",
    "title": "IR THERMOGRAPHY REPORT",
    "report_type": "Infrared Thermography Survey Report",
    "equipment_fields": [
        {"name": "equipment_name", "label": "Equipment/Area Name", "type": "text"},
        {"name": "location", "label": "Location", "type": "text"},
        {"name": "survey_date", "label": "Survey Date", "type": "date"},
        {"name": "load_condition", "label": "Load Condition", "type": "text", "unit": "%"},
        {"name": "ambient_temp", "label": "Ambient Temperature", "type": "text", "unit": "°C"},
        {"name": "emissivity", "label": "Emissivity", "type": "text"},
    ],
    "thermal_findings": {
        "title": "Thermal Findings",
        "severity_levels": ["Normal", "Attention", "Intermediate", "Serious", "Critical"],
        "columns": ["Component", "Reference Temp (°C)", "Hot Spot Temp (°C)", "ΔT (°C)", "Severity", "Recommendation"]
    },
    "checklist": [
        {"id": 1, "item": "Switchgear panels surveyed"},
        {"id": 2, "item": "Cable terminations checked"},
        {"id": 3, "item": "Bus bar connections surveyed"},
        {"id": 4, "item": "Transformer bushings checked"},
        {"id": 5, "item": "Motor terminals surveyed"},
    ],
    "notes": [
        "Survey conducted as per NETA MTS standards",
        "Thermal images attached separately"
    ]
}

# ==================== AMC Report Template ====================
AMC_REPORT_TEMPLATE = {
    "equipment_type": "amc",
    "title": "AMC SERVICE REPORT",
    "report_type": "Annual Maintenance Contract Service Report",
    "equipment_fields": [
        {"name": "amc_no", "label": "AMC Number", "type": "text"},
        {"name": "visit_date", "label": "Visit Date", "type": "date"},
        {"name": "visit_type", "label": "Visit Type", "type": "select", "options": ["Scheduled", "Emergency", "Breakdown"]},
        {"name": "technician", "label": "Technician Name", "type": "text"},
    ],
    "checklist": [
        {"id": 1, "item": "Equipment inspection completed"},
        {"id": 2, "item": "Preventive maintenance done"},
        {"id": 3, "item": "Cleaning performed"},
        {"id": 4, "item": "Functional tests conducted"},
        {"id": 5, "item": "Customer sign-off obtained"},
    ],
    "notes": []
}

# Add these to EQUIPMENT_TEMPLATES
EQUIPMENT_TEMPLATES["other"] = OTHER_TEMPLATE
EQUIPMENT_TEMPLATES["ir-thermography"] = IR_THERMOGRAPHY_TEMPLATE
EQUIPMENT_TEMPLATES["ir_thermography"] = IR_THERMOGRAPHY_TEMPLATE
EQUIPMENT_TEMPLATES["amc"] = AMC_REPORT_TEMPLATE


def get_equipment_template(equipment_type: str) -> dict:
    """Get template for a specific equipment type."""
    return EQUIPMENT_TEMPLATES.get(equipment_type.lower(), OTHER_TEMPLATE)


def get_all_equipment_types() -> list:
    """Get list of all available equipment types."""
    return list(set([
        "acb", "mccb", "vcb", "panel", "relay", "apfc", 
        "earth_pit", "ups", "dg", "lightning_arrestor", "energy_meter",
        "voltmeter", "ammeter", "transformer", "ir-thermography", "other", "amc"
    ]))
