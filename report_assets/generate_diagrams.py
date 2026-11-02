import os
from PIL import Image, ImageDraw, ImageFont

def get_font(name="arial.ttf", size=16, bold=False):
    font_file = "arialbd.ttf" if bold else "arial.ttf"
    try:
        return ImageFont.truetype(f"C:\\Windows\\Fonts\\{font_file}", size)
    except:
        return ImageFont.load_default()

def create_block_diagram():
    # 4 columns with arrows between them
    w, h = 1200, 650
    img = Image.new('RGB', (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    f_title = get_font(size=18, bold=True)
    f_sub = get_font(size=13, bold=True)
    f_body = get_font(size=11, bold=False)
    f_badge = get_font(size=11, bold=True)

    # 4 Columns definitions
    cols = [
        {
            "title": "Physical Sensing Layer",
            "subtitle": "Multipurpose Object & Sensor",
            "color": "#e0f2fe",
            "border": "#38bdf8",
            "header_bg": "#0284c7",
            "items": [
                ("Monitored Object", "Door, Window, Cabinet, Locker"),
                ("Actuator Magnet", "Mounted on moving leaf/sash"),
                ("MC-38 Reed Switch", "Fixed contact sensor on frame"),
                ("Direct 2-Wire Interface", "Direct wiring to GPIO 4 & GND")
            ]
        },
        {
            "title": "Processing & Connectivity",
            "subtitle": "ESP32 IoT Controller",
            "color": "#fef9c3",
            "border": "#facc15",
            "header_bg": "#ca8a04",
            "items": [
                ("ESP32 Microcontroller", "240MHz Dual-Core Xtensa MCU"),
                ("Internal Pull-Up Logic", "INPUT_PULLUP (Direct pin sensing)"),
                ("Software Debouncing", "50ms non-blocking state filter"),
                ("Wi-Fi Telemetry Engine", "2.4 GHz 802.11 b/g/n transmission"),
                ("Device Heartbeat Ping", "Periodic keep-alive ping (10-30s)")
            ]
        },
        {
            "title": "Containerized Backend",
            "subtitle": "Flask REST & PostgreSQL",
            "color": "#ede9fe",
            "border": "#a78bfa",
            "header_bg": "#7c3aed",
            "items": [
                ("Dockerized Flask API", "Python Flask 3 containerized service"),
                ("PostgreSQL Database", "PostgreSQL 16 in Docker container"),
                ("Persistent Data Volume", "Named volume for event history logs"),
                ("REST Endpoints", "/api/events, /api/status, /api/devices"),
                ("Connection Tracker", "Detects active vs offline devices")
            ]
        },
        {
            "title": "User Interface & Action",
            "subtitle": "React Web Dashboard",
            "color": "#fee2e2",
            "border": "#f87171",
            "header_bg": "#dc2626",
            "items": [
                ("React Web Dashboard", "Responsive UI (Vite + TypeScript)"),
                ("Real-Time Status Display", "Instant OPEN / CLOSED portal view"),
                ("Device Offline Warning", "Shows device disconnected if no ping"),
                ("Acoustic Siren Deterrence", "Audible browser alarm on threshold"),
                ("Audit Event Analytics", "Continuous duration & event history")
            ]
        }
    ]

    col_w = 260
    col_gap = 40
    start_x = (w - (4 * col_w + 3 * col_gap)) // 2
    start_y = 40

    for i, col in enumerate(cols):
        cx = start_x + i * (col_w + col_gap)
        cy = start_y

        # Draw box
        box_rect = [cx, cy, cx + col_w, cy + 560]
        draw.rounded_rectangle(box_rect, radius=16, fill=col["color"], outline=col["border"], width=2)

        # Header
        draw.rounded_rectangle([cx, cy, cx + col_w, cy + 60], radius=14, fill=col["header_bg"])
        draw.rectangle([cx, cy + 45, cx + col_w, cy + 60], fill=col["header_bg"])
        
        # Header text
        tw = draw.textlength(col["title"], font=f_title)
        draw.text((cx + (col_w - tw) / 2, cy + 12), col["title"], fill="#ffffff", font=f_title)
        sw = draw.textlength(col["subtitle"], font=f_badge)
        draw.text((cx + (col_w - sw) / 2, cy + 36), col["subtitle"], fill="#f1f5f9", font=f_badge)

        # Items
        item_y = cy + 78
        for title, desc in col["items"]:
            # Card inside column
            draw.rounded_rectangle([cx + 12, item_y, cx + col_w - 12, item_y + 82], radius=10, fill="#ffffff", outline=col["border"], width=1)
            draw.text((cx + 22, item_y + 12), title, fill="#0f172a", font=f_sub)
            draw.text((cx + 22, item_y + 36), desc, fill="#64748b", font=f_body)
            item_y += 94

        # Draw Arrow to next box
        if i < 3:
            arrow_x = cx + col_w + 5
            arrow_y = cy + 280
            draw.line([(arrow_x, arrow_y), (arrow_x + 30, arrow_y)], fill="#475569", width=3)
            draw.polygon([(arrow_x + 30, arrow_y - 6), (arrow_x + 30, arrow_y + 6), (arrow_x + 38, arrow_y)], fill="#475569")

    out_path = "e:\\IOT\\report_assets\\block_diagram.png"
    img.save(out_path, quality=95)
    print(f"Saved: {out_path}")

def create_hardware_diagram():
    w, h = 1100, 600
    img = Image.new('RGB', (w, h), color=(248, 250, 252))
    draw = ImageDraw.Draw(img)

    f_title = get_font(size=19, bold=True)
    f_sub = get_font(size=13, bold=True)
    f_body = get_font(size=11, bold=False)

    # Title
    draw.text((50, 25), "PORTABLE MULTIPURPOSE IOT SYSTEM - HARDWARE & SENSOR INTERFACE", fill="#0f172a", font=f_title)

    # 1. ESP32 Microcontroller Box
    esp_box = [60, 90, 480, 530]
    draw.rounded_rectangle(esp_box, radius=18, fill="#1e293b", outline="#334155", width=3)

    # ESP32 Header
    draw.text((85, 115), "ESP32 Development Board (30-Pin MCU)", fill="#38bdf8", font=get_font(size=17, bold=True))
    draw.text((85, 145), "Dual-Core 240MHz | Built-in 802.11 b/g/n Wi-Fi", fill="#94a3b8", font=f_body)

    # Pins diagram
    pins = [
        ("3V3", "3.3V Regulated Output", "#38bdf8"),
        ("GND", "System Ground Reference", "#94a3b8"),
        ("GPIO 4", "Reed Sensor Pin (INPUT_PULLUP)", "#4ade80"),
        ("GPIO 2", "Onboard Blue Status LED", "#facc15"),
        ("VIN / 5V", "5V DC Micro-USB / Battery Input", "#f87171"),
        ("EN / RST", "System Reset Pin", "#c084fc"),
    ]

    py = 190
    for pin, desc, col in pins:
        draw.rounded_rectangle([85, py, 455, py + 46], radius=8, fill="#0f172a", outline=col, width=1)
        draw.text((105, py + 12), pin, fill=col, font=f_sub)
        draw.text((205, py + 14), desc, fill="#e2e8f0", font=f_body)
        py += 54

    # 2. Sensor Box
    sensor_box = [600, 90, 1040, 310]
    draw.rounded_rectangle(sensor_box, radius=18, fill="#ffffff", outline="#10b981", width=3)
    draw.text((625, 115), "Magnetic Reed Switch Sensor (MC-38)", fill="#059669", font=get_font(size=17, bold=True))
    draw.text((625, 142), "Direct 2-wire interface (Direct pin-to-sensor wiring)", fill="#64748b", font=f_body)

    draw.rounded_rectangle([625, 180, 810, 278], radius=10, fill="#f0fdf4", outline="#86efac", width=1)
    draw.text((640, 195), "Sensor Wire 1", fill="#166534", font=f_sub)
    draw.text((640, 220), "Direct to GPIO 4", fill="#15803d", font=f_body)
    draw.text((640, 240), "Internal INPUT_PULLUP", fill="#64748b", font=f_body)

    draw.rounded_rectangle([830, 180, 1015, 278], radius=10, fill="#f8fafc", outline="#cbd5e1", width=1)
    draw.text((845, 195), "Sensor Wire 2", fill="#334155", font=f_sub)
    draw.text((845, 220), "Direct to GND Pin", fill="#475569", font=f_body)
    draw.text((845, 240), "Ground Reference", fill="#64748b", font=f_body)

    # 3. Magnet & Multipurpose Frame Box
    mag_box = [600, 340, 1040, 530]
    draw.rounded_rectangle(mag_box, radius=18, fill="#ffffff", outline="#6366f1", width=3)
    draw.text((625, 365), "Multipurpose Operation: Door / Window / Cabinet / Locker", fill="#4f46e5", font=get_font(size=15, bold=True))

    draw.rounded_rectangle([625, 405, 810, 500], radius=10, fill="#eef2ff", outline="#c7d2fe", width=1)
    draw.text((640, 420), "Object CLOSED State", fill="#3730a3", font=f_sub)
    draw.text((640, 445), "Magnet < 15mm: Closed", fill="#4338ca", font=f_body)
    draw.text((640, 465), "Pin 4 = LOW (0V)", fill="#16a34a", font=f_sub)

    draw.rounded_rectangle([830, 405, 1015, 500], radius=10, fill="#fff1f2", outline="#fecdd3", width=1)
    draw.text((845, 420), "Object OPEN State", fill="#9f1239", font=f_sub)
    draw.text((845, 445), "Magnet > 25mm: Open", fill="#be123c", font=f_body)
    draw.text((845, 465), "Pin 4 = HIGH (3.3V)", fill="#dc2626", font=f_sub)

    # Connecting wires from ESP32 to Sensor
    draw.line([(455, 305), (550, 305), (550, 220), (625, 220)], fill="#4ade80", width=4) # GPIO 4 Wire
    draw.text((490, 265), "GPIO 4 (Signal)", fill="#16a34a", font=f_sub)

    draw.line([(455, 250), (530, 250), (530, 250), (600, 250), (830, 250)], fill="#64748b", width=4) # GND Wire
    draw.text((490, 225), "GND (Ground)", fill="#475569", font=f_sub)

    out_path = "e:\\IOT\\report_assets\\hardware_components.png"
    img.save(out_path, quality=95)
    print(f"Saved: {out_path}")

def create_circuit_assembly():
    w, h = 1100, 550
    img = Image.new('RGB', (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    f_title = get_font(size=18, bold=True)
    f_sub = get_font(size=13, bold=True)
    f_body = get_font(size=11, bold=False)

    draw.text((50, 20), "PORTABLE MONITORING UNIT - PHYSICAL ASSEMBLY & MULTIPURPOSE MOUNTING", fill="#0f172a", font=f_title)

    # Background Base: Physical Mounting Surface (Door / Window / Locker frame)
    mount_rect = [50, 70, 1050, 500]
    draw.rounded_rectangle(mount_rect, radius=20, fill="#f8fafc", outline="#cbd5e1", width=2)
    draw.text((70, 85), "PHYSICAL INSTALLATION AREA (Door / Window Sash / Cabinet / Locker)", fill="#64748b", font=get_font(size=11, bold=True))

    # Left: Portable IoT Controller Enclosure
    draw.rounded_rectangle([90, 120, 440, 460], radius=14, fill="#1e293b", outline="#475569", width=3)
    draw.text((120, 140), "PORTABLE ESP32 MONITORING UNIT", fill="#38bdf8", font=f_sub)
    draw.text((120, 165), "Compact Reusable Enclosure (Direct Wire Mounting)", fill="#94a3b8", font=f_body)

    # Wi-Fi PCB Antenna
    draw.rectangle([130, 195, 400, 235], fill="#0284c7")
    draw.text((180, 208), "2.4 GHz Integrated PCB Wi-Fi Antenna", fill="#ffffff", font=get_font(size=11, bold=True))

    # ESP32 IC
    draw.rounded_rectangle([180, 260, 350, 360], radius=8, fill="#0f172a", outline="#64748b", width=1)
    draw.text((215, 305), "ESP-WROOM-32", fill="#cbd5e1", font=get_font(size=12, bold=True))

    # Status LED
    draw.ellipse([360, 390, 385, 415], fill="#38bdf8", outline="#0284c7", width=2)
    draw.text((220, 395), "Status LED (GPIO 2)", fill="#93c5fd", font=f_body)

    # Power Cable indicator
    draw.text((120, 430), "Power: 5V Micro-USB / Portable Power Bank", fill="#fca5a5", font=get_font(size=10, bold=True))

    # Center: Fixed Magnetic Reed Switch
    draw.rounded_rectangle([530, 140, 730, 430], radius=14, fill="#f1f5f9", outline="#0f172a", width=3)
    draw.text((550, 165), "MC-38 Reed Switch", fill="#0f172a", font=f_sub)
    draw.text((550, 190), "(Stationary Frame/Jamb)", fill="#64748b", font=get_font(size=11, bold=False))

    draw.rounded_rectangle([555, 230, 705, 370], radius=8, fill="#ffffff", outline="#94a3b8", width=2)
    draw.text((580, 290), "Hermetic Reeds", fill="#0f172a", font=f_sub)
    draw.text((570, 315), "(Non-contact switch)", fill="#64748b", font=f_body)

    # Right: Movable Actuator Magnet
    draw.rounded_rectangle([800, 140, 990, 430], radius=14, fill="#fef2f2", outline="#ef4444", width=3)
    draw.text((820, 165), "Actuator Magnet", fill="#b91c1c", font=f_sub)
    draw.text((820, 190), "(Movable Door/Locker)", fill="#991b1b", font=get_font(size=11, bold=False))

    draw.rounded_rectangle([825, 230, 965, 370], radius=8, fill="#fee2e2", outline="#f87171", width=2)
    draw.text((855, 290), "PERMANENT", fill="#b91c1c", font=f_sub)
    draw.text((865, 315), "MAGNET", fill="#b91c1c", font=f_sub)

    # Magnetic field gap lines
    draw.line([(735, 270), (795, 270)], fill="#ef4444", width=2)
    draw.line([(735, 300), (795, 300)], fill="#ef4444", width=2)
    draw.line([(735, 330), (795, 330)], fill="#ef4444", width=2)
    draw.text((740, 345), "< 15mm gap", fill="#ef4444", font=get_font(size=10, bold=True))

    # Direct wiring leads from ESP32 to switch
    draw.line([(440, 280), (485, 280), (485, 260), (530, 260)], fill="#16a34a", width=4)
    draw.text((450, 235), "Wire 1 -> GPIO 4", fill="#16a34a", font=f_sub)

    draw.line([(440, 340), (485, 340), (485, 320), (530, 320)], fill="#475569", width=4)
    draw.text((450, 345), "Wire 2 -> GND", fill="#475569", font=f_sub)

    out_path = "e:\\IOT\\report_assets\\circuit_assembly.png"
    img.save(out_path, quality=95)
    print(f"Saved: {out_path}")

create_block_diagram()
create_hardware_diagram()
create_circuit_assembly()
print("All multipurpose diagram assets updated successfully!")
