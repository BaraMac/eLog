import React, { useState } from "react";
import { ACCESS_PASSWORD, AUTHORIZED_STAFF } from "./config";
import { regDatabase } from "./src/regDatabase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

function splitTextIntoLines(text: string, maxCharsPerLine = 40): string[] {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  for (let word of words) {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += word + " ";
    } else {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [regKnown, setRegKnown] = useState(true);
  const [techName, setTechName] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [opRows, setOpRows] = useState(4);
  const [form, setForm] = useState({
    date: "",
    location: "AUH",
    aircraftReg: "",
    aircraftType: "",
    maintenanceType: "A1 - LINE",
    privilege: "",
    taskTypes: [],
    activityTypes: [],
    ata: "",
    operationPerformed: "",
    duration: "",
    recordRef: "",
    remarks: "",
  });

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };
    if (field === "aircraftReg") {
      let cleanSuffix = value.trim().toUpperCase();
      if (cleanSuffix.startsWith("A6-")) {
        cleanSuffix = cleanSuffix.slice(3);
      }
      const fullReg = `A6-${cleanSuffix}`;
      const match = regDatabase[fullReg];
      updated.aircraftReg = fullReg;
      if (match) {
        updated.aircraftType = match;
        setRegKnown(true);
      } else {
        updated.aircraftType = "";
        setRegKnown(false);
      }
    }
    setForm(updated);
  };

  const handleCheckbox = (field, value) => {
    const existing = form[field];
    const updated = existing.includes(value)
      ? existing.filter((v) => v !== value)
      : [...existing, value];
    setForm({ ...form, [field]: updated });
  };

  const saveNewReg = () => {
    const updatedDB = {
      ...regDatabase,
      [form.aircraftReg.toUpperCase()]: form.aircraftType,
    };
    setRegDatabase(updatedDB);
    setRegKnown(true);
    alert(`Saved ${form.aircraftReg.toUpperCase()} ➝ ${form.aircraftType}`);
  };

  const isStaffAuthorized = AUTHORIZED_STAFF.includes(
    staffNumber.trim().toUpperCase()
  );
  const isPDFEnabled = techName.trim() !== "" && isStaffAuthorized;

  const handleSaveEntry = () => {
    setEntries([...entries, form]);
    alert("Entry saved!");
    resetForm();
  };
  const handleResetEntries = () => {
    setEntries([]);
    alert("All saved entries cleared!");
  };
  const resetForm = () => {
    setOpRows(4); // Reset height of OP box
    setForm({
      date: "",
      location: "AUH",
      aircraftReg: "",
      aircraftType: "",
      maintenanceType: "A1 - LINE",
      privilege: "",
      taskTypes: [],
      activityTypes: [],
      ata: "",
      operationPerformed: "",
      duration: "",
      recordRef: "",
      remarks: "",
    });
  };

  async function generateQA105PDF() {
    const existingPdfBytes = await fetch("/qa105_template.pdf").then((res) =>
      res.arrayBuffer()
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(techName, {
      x: 80,
      y: height - 550,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(staffNumber, {
      x: 380,
      y: height - 550,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    if (entries.length > 0) {
      const firstEntry = entries[0];
      const typeText = firstEntry.aircraftType || "";
      const engineSplit = typeText.match(/^(.+?)\s*\((.+)\)$/);
      const formattedHeader = engineSplit
        ? `${engineSplit[1].trim()} / ${engineSplit[2].trim()}`
        : typeText;

      page.drawText(formattedHeader, {
        x: 450,
        y: height - 105,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      page.drawText(firstEntry.ata || "", {
        x: 790,
        y: height - 105,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
    }

    let rowCounter = 0;
    let entryCounter = 0;
    while (entryCounter < entries.length) {
      const entry = entries[entryCounter];
      const opLines = splitTextIntoLines(entry.operationPerformed || "", 28);
      const remarksLines = splitTextIntoLines(entry.remarks || "", 10);
      let opLineIndex = 0;

      while (opLineIndex < opLines.length) {
        const baseY = height - 210 - 39 * rowCounter;
        const isFirstRow = opLineIndex === 0;

        if (isFirstRow) {
          const formattedDate = new Date(entry.date)
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .toUpperCase();

          page.drawText(formattedDate, {
            x: 27,
            y: baseY,
            size: 7,
            font,
            color: rgb(0, 0, 0),
          });
          page.drawText(entry.location || "", {
            x: 84,
            y: baseY,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });

          const typeText = entry.aircraftType || "";
          const engineSplit = typeText.match(/^(.+?)\s*\((.+)\)$/);

          if (engineSplit) {
            const aircraft = engineSplit[1].trim();
            const engine = engineSplit[2].trim();
            const aircraftTextWidth = font.widthOfTextAtSize(aircraft, 7);
            const engineTextWidth = font.widthOfTextAtSize(engine, 7);
            const col3CenterX = 145;
            page.drawText(aircraft, {
              x: col3CenterX - aircraftTextWidth / 2,
              y: baseY + 2,
              size: 7,
              font,
              color: rgb(0, 0, 0),
            });
            page.drawText(engine, {
              x: col3CenterX - engineTextWidth / 2,
              y: baseY - 6,
              size: 7,
              font,
              color: rgb(0, 0, 0),
            });
          }

          page.drawText(entry.aircraftReg || "", {
            x: 190,
            y: baseY,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
          page.drawText(entry.maintenanceType || "", {
            x: 240,
            y: baseY,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
          page.drawText(entry.privilege || "", {
            x: 295,
            y: baseY,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });

          const taskTypePositions = {
            FOT: 332,
            SGH: 346,
            "R/I": 360,
            TS: 374,
            MOD: 388,
            REP: 402,
            INSP: 416,
          };
          entry.taskTypes.forEach((type) => {
            const xPos = taskTypePositions[type];
            if (xPos !== undefined) {
              page.drawText("X", {
                x: xPos,
                y: baseY - 1,
                size: 10,
                font,
                color: rgb(0, 0, 0),
              });
            }
          });

          const activityTypePositions = {
            Training: 431,
            Perform: 445,
            Supervise: 459,
            CRS: 473,
          };
          entry.activityTypes.forEach((type) => {
            const xPos = activityTypePositions[type];
            if (xPos !== undefined) {
              page.drawText("X", {
                x: xPos,
                y: baseY - 1,
                size: 10,
                font,
                color: rgb(0, 0, 0),
              });
            }
          });

          page.drawText(entry.ata || "", {
            x: 490,
            y: baseY,
            size: 9,
            font,
            color: rgb(0, 0, 0),
          });
          const durX = (entry.duration || "").length === 1 ? 641 : 636;
          page.drawText(entry.duration || "", {
            x: durX,
            y: baseY,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
          page.drawText(entry.recordRef || "", {
            x: 670,
            y: baseY,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });

          for (let j = 0; j < remarksLines.length && j < 3; j++) {
            page.drawText(remarksLines[j], {
              x: 780,
              y: baseY - j * 8,
              size: 8,
              font,
              color: rgb(0, 0, 0),
            });
          }
        }

        for (let i = 0; i < 3 && opLineIndex < opLines.length; i++) {
          page.drawText(opLines[opLineIndex], {
            x: 510,
            y: baseY + 4 - i * 8,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
          opLineIndex++;
        }
        rowCounter++;
      }
      rowCounter++;
      entryCounter++;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "QA105_Filled.pdf";
    link.click();
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      {!hasAccess ? (
        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Enter Access Password"
            type="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
          />
          <button
            onClick={() => {
              if (enteredPassword === ACCESS_PASSWORD) {
                setHasAccess(true);
              }
            }}
            style={{ marginLeft: 10 }}
          >
            Unlock
          </button>
        </div>
      ) : (
        <>
          <h2> Etihad QA 105 Logbook Entry Form</h2>
          <input
            placeholder="Technician Name"
            value={techName}
            onChange={(e) => setTechName(e.target.value)}
          />
          <br />
          <input
            placeholder="Staff Number"
            value={staffNumber}
            onChange={(e) => setStaffNumber(e.target.value)}
          />
          <br />
          {/* ... rest of your form code ... */}
          <br />
          <input
            placeholder="Date"
            type="date"
            value={form.date}
            onChange={(e) => handleChange("date", e.target.value)}
          />
          <br />
          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
          />
          <br />
          <input
            placeholder="Aircraft Registration (e.g., A6-EYE)"
            value={form.aircraftReg}
            onChange={(e) => handleChange("aircraftReg", e.target.value)}
          />
          <br />
          <input
            placeholder="Aircraft Type"
            value={form.aircraftType}
            onChange={(e) => handleChange("aircraftType", e.target.value)}
            readOnly={regKnown}
          />
          <br />
          {!regKnown && form.aircraftReg.length > 4 && (
            <button onClick={saveNewReg}>Save Aircraft Type</button>
          )}
          <br />

          <select
            value={form.privilege}
            onChange={(e) => handleChange("privilege", e.target.value)}
          >
            <option value="">Select Privilege</option>
            <option value="A">A</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C">C</option>
          </select>
          <br />

          <label>Task Types:</label>
          {["FOT", "SGH", "R/I", "TS", "MOD", "REP", "INSP"].map((t) => (
            <label key={t} style={{ marginRight: 10 }}>
              <input
                type="checkbox"
                checked={form.taskTypes.includes(t)}
                onChange={() => handleCheckbox("taskTypes", t)}
              />{" "}
              {t}
            </label>
          ))}
          <br />

          <label>Activity Types:</label>
          {["Training", "Perform", "Supervise", "CRS"].map((a) => (
            <label key={a} style={{ marginRight: 10 }}>
              <input
                type="checkbox"
                checked={form.activityTypes.includes(a)}
                onChange={() => handleCheckbox("activityTypes", a)}
              />{" "}
              {a}
            </label>
          ))}
          <br />
          <input
            placeholder="ATA Chapter (e.g., 32)"
            value={form.ata}
            onChange={(e) => handleChange("ata", e.target.value)}
          />

          <br />
          <input
            placeholder="Time Duration (hrs)"
            type="number"
            value={form.duration}
            onChange={(e) => handleChange("duration", e.target.value)}
          />
          <input
            placeholder="Maintenance Record Ref"
            value={form.recordRef}
            onChange={(e) => handleChange("recordRef", e.target.value)}
          />
          <br />
          <textarea
            placeholder="Operation Performed"
            value={form.operationPerformed}
            onChange={(e) => handleChange("operationPerformed", e.target.value)}
            rows={4}
            style={{ width: "100%" }}
          />
          <br />
          <textarea
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) => handleChange("remarks", e.target.value)}
            rows={4}
            style={{ width: "100%" }}
          />
          <br />
          <hr />
          <h3>Saved Entries (for testing)</h3>
          <ul>
            {entries.map((entry, index) => (
              <li key={index}>
                {entry.date} | {entry.aircraftReg} | {entry.operationPerformed}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={handleSaveEntry}>Save Entry</button>
            <button onClick={generateQA105PDF} disabled={!isPDFEnabled}>
              Generate QA105 PDF
            </button>
            <button onClick={handleResetEntries}>Clear Entries</button>
          </div>
        </>
      )}
    </div>
  );
}
