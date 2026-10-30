var questions = [];
var i = 0;
var count = 0;
var score = 0;
var Ansgiven = []; // Store answers given by the user
var previousQuestionIndex = null; // Track the previously displayed question
var topicName = ""; // Variable to store the topic name
const submitSound = document.getElementById("submit-sound");

const uniqueKey = "G8M2Math_Homework";

// ============================================================
// FRACTION HELPER FUNCTIONS (from File 2)
// ============================================================

// Converts fraction answers into sorted rational strings for unordered comparison
function buildRationalSet(answers, question) {
  var rationals = [];
  var index = 0;

  question.question.forEach(function (part) {
    if (part.fraction) {
      var whole =
        part.fraction.whole === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.whole || 0);

      var num =
        part.fraction.numerator === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.numerator);

      var den =
        part.fraction.denominator === "______"
          ? parseInt(answers[index++])
          : parseInt(part.fraction.denominator);

      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        var improper = whole * den + num;
        var g = gcd(improper, den);
        rationals.push(improper / g + "/" + den / g);
      }
    }
  });

  return rationals.sort();
}

// Greatest common divisor helper
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Converts flat answer array into human-readable fraction HTML strings for review display
function buildDisplayString(answers, question) {
  if (!answers || !Array.isArray(answers)) return String(answers || "");

  var slots = [];

  var questionParts = Array.isArray(question.question)
    ? question.question
    : [question.question];

  questionParts.forEach(function (part) {
    if (typeof part === "string") {
      var matches = part.match(
        /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g,
      );
      if (matches) {
        matches.forEach(function () {
          slots.push({ type: "whole" });
        });
      }
    } else if (part.root) {
      // root with blank value counts as one input slot
      if (part.root.value === "______") {
        slots.push({ type: "whole" });
      }
      // fixed root values (e.g. ∛150) contribute no input slot
    } else if (part.fraction) {
      var numIsArray = Array.isArray(part.fraction.numerator);
      var wholeBlank = part.fraction.whole === "______";
      var numBlank = part.fraction.numerator === "______";
      var denBlank = part.fraction.denominator === "______";

      // Skip fully fixed fractions — nothing to display from answers
      if (!wholeBlank && !numBlank && !numIsArray && !denBlank) return;

      slots.push({
        type: "mixedFraction",
        wholeBlank,
        numIsArray,
        numArray: numIsArray ? part.fraction.numerator : null,
        numBlank,
        denBlank,
        whole: part.fraction.whole,
        num: part.fraction.numerator,
        den: part.fraction.denominator,
      });
    }
  });

  var parts = [];
  var answerIndex = 0;

  if (slots.length === 0) {
    return answers
      .map((a) => `<span>${a !== undefined && a !== null ? a : "?"}</span>`)
      .join(" , ");
  }

  slots.forEach(function (slot) {
    if (slot.type === "mixedFraction") {
      var whole = slot.wholeBlank ? answers[answerIndex++] : slot.whole;

      var numDisplay = "";
      if (slot.numIsArray) {
        // Build "18 + 8" or "18 − 8" from array
        numDisplay = slot.numArray
          .map((item) => {
            if (item === "______") return answers[answerIndex++] || "?";
            return item;
          })
          .join(" ");
      } else if (slot.numBlank) {
        numDisplay = answers[answerIndex++];
      } else {
        numDisplay = slot.num;
      }

      var den = slot.denBlank ? answers[answerIndex++] : slot.den;

      parts.push(`
        <span class="display-fraction">
          ${whole ? `<span class="whole-part">${whole}</span>` : ""}
          <span class="fraction-part">
            <span class="numerator">${numDisplay}</span>
            <span class="denominator">${den}</span>
          </span>
        </span>
      `);
    } else {
      parts.push(
        `<span>${answers[answerIndex] !== undefined && answers[answerIndex] !== null ? answers[answerIndex] : "?"}</span>`,
      );
      answerIndex++;
    }
  });

  return parts.join(" , ");
}

// Formats textParts array (mixed text + fraction objects) into HTML string
function formatTextPartsForDisplay(textParts) {
  return textParts
    .map(function (part) {
      if (typeof part === "string") {
        return part;
      } else if (part.fraction) {
        const { whole, numerator, denominator } = part.fraction;
        return `
        <span class="display-fraction">
          <span class="fraction-part">
            <span class="numerator">${numerator}</span>
            <span class="denominator">${denominator}</span>
          </span>
        </span>
      `;
      }
      return "";
    })
    .join("");
}

// ============================================================
// ROOT RENDERER (√ symbol with overline)
// ============================================================

function renderRoot(rootObj, overrideColor) {
  const { index, value } = rootObj;
  const rootColor = overrideColor || "#1a2a4a";
  const textColor = overrideColor || "#222";

  const indexHTML =
    index && index !== 2
      ? `<span style="font-size:0.8em;font-weight:bold;color:${rootColor};position:relative;top:-12px;margin-right:-2px;">${index}</span>`
      : "";

  // If value is a blank — render an input box inside the radical
  const innerContent =
    value === "______"
      ? `<input type="text" class="answer-input" autocomplete="off"
           style="width:45px;height:32px;border:2px solid #007bff;border-radius:4px;
                  font-size:0.9em;font-weight:bold;text-align:center;background:white;
                  outline:none;padding:0;margin:0 2px;" />`
      : `<span style="font-size:1em;font-weight:bold;padding:0 3px;color:${textColor};">${value}</span>`;

  return `<span style="display:inline-flex;align-items:flex-end;vertical-align:middle;margin:0 4px;color:${textColor};">
    <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;position:relative;">
      ${indexHTML}
      <span style="font-size:1.6em;font-family:serif;line-height:1;color:${rootColor};margin-right:-2px;position:relative;top:4px;">√</span>
      <span style="border-top:2.5px solid ${rootColor};display:inline-flex;align-items:center;padding:9px 6px 2px 4px;white-space:nowrap;margin-top:4px;">
        ${innerContent}
      </span>
    </span>
  </span>`;
}

// ============================================================
// ADDITION GRID BUILDER
// ============================================================

function buildAdditionGridHTML(question, resultValues, mode) {
  const layout = question.layout;
  const cols = Math.max(
    (layout.carry || []).length,
    (layout.top || []).length,
    (layout.bottom || []).length,
    (layout.result || []).length,
  );

  const normalize = (arr = []) => {
    const copy = [...arr];
    while (copy.length < cols) copy.unshift(null);
    return copy;
  };

  const carry = normalize(layout.carry || new Array(cols).fill(null));
  const place = layout.place ? normalize(layout.place) : null;
  const top = normalize(layout.top);
  const bottom = normalize(layout.bottom);
  const result = normalize(layout.result);

  const colColors = [
    "#e53935",
    "#7b1fa2",
    "#212121",
    "#e65100",
    "#1565c0",
    "#2e7d32",
  ];
  const getColor = (idx) => colColors[idx % colColors.length];

  let resultIdx = 0;

  const gridStyle = `
    display:grid;
    grid-template-columns: 36px repeat(${cols}, 52px);
    gap:4px 2px;
    align-items:center;
    justify-items:center;
    font-size:1.4rem;
    font-weight:bold;
    padding:16px;
    background:#fff;
    border-radius:10px;
    border:1px solid #ddd;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  `;

  const cellStyle = (extra = "") =>
    `display:flex;align-items:center;justify-content:center;
     min-width:44px;min-height:44px;${extra}`;

  let html = `<div style="${gridStyle}">`;

  /* ===== Carry Row ===== */
  html += `<div></div>`;
  carry.forEach((val) => {
    if (val === "_") {
      html += `<div style="${cellStyle("font-size:0.9rem;color:#888;align-items:flex-end;padding-bottom:2px;")}">
                 <span style="border:1px solid #ccc;border-radius:4px;
                              padding:2px 8px;min-width:28px;text-align:center;
                              background:#f9f9f9;">&nbsp;</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle("font-size:0.9rem;color:#888;align-items:flex-end;padding-bottom:2px;")}">${val ?? ""}</div>`;
    }
  });

  /* ===== Place Row ===== */
  if (place) {
    html += `<div></div>`;
    place.forEach((val, ci) => {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1rem;font-weight:700;`)}">${val ?? ""}</div>`;
    });
  }

  /* ===== Top Row ===== */
  html += `<div></div>`;
  top.forEach((val, ci) => {
    if (val === "_") {
      const filled = (resultValues[resultIdx] || "").trim().toLowerCase();
      const correct = (question.answer[resultIdx] || "").trim().toLowerCase();
      const isRight = filled === correct;
      const display =
        mode === "student"
          ? resultValues[resultIdx] || ""
          : question.answer[resultIdx] || "";

      const bgColor =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const txtColor =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

      resultIdx++;
      html += `<div style="${cellStyle()}">
                 <span style="
                   background:${bgColor};
                   color:${txtColor};
                   border-radius:6px;
                   min-width:44px;
                   height:44px;
                   display:flex;
                   align-items:center;
                   justify-content:center;
                   font-size:1.5rem;
                   font-weight:bold;
                 ">${display || "?"}</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1.6rem;`)}">${val ?? ""}</div>`;
    }
  });

  /* ===== Bottom Row ===== */
  html += `<div style="${cellStyle("justify-content:flex-end;padding-right:4px;font-size:1.6rem;")}">${layout.sign || "+"}</div>`;
  bottom.forEach((val, ci) => {
    if (val === "_") {
      const filled = (resultValues[resultIdx] || "").trim().toLowerCase();
      const correct = (question.answer[resultIdx] || "").trim().toLowerCase();
      const isRight = filled === correct;
      const display =
        mode === "student"
          ? resultValues[resultIdx] || ""
          : question.answer[resultIdx] || "";

      const bgColor =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const txtColor =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

      resultIdx++;
      html += `<div style="${cellStyle()}">
                 <span style="
                   background:${bgColor};
                   color:${txtColor};
                   border-radius:6px;
                   min-width:44px;
                   height:44px;
                   display:flex;
                   align-items:center;
                   justify-content:center;
                   font-size:1.5rem;
                   font-weight:bold;
                 ">${display || "?"}</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1.6rem;`)}">${val ?? ""}</div>`;
    }
  });

  /* ===== Line ===== */
  html += `<div style="grid-column:1/span ${cols + 1};height:3px;
                        background:#333;width:100%;margin:2px 0;"></div>`;

  /* ===== Result Row ===== */
  html += `<div></div>`;
  result.forEach((val, ci) => {
    if (val === "_") {
      const filled = (resultValues[resultIdx] || "").trim().toLowerCase();
      const correct = (question.answer[resultIdx] || "").trim().toLowerCase();
      const isRight = filled === correct;
      const display =
        mode === "student"
          ? resultValues[resultIdx] || ""
          : question.answer[resultIdx] || "";

      const bgColor =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const txtColor =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

      resultIdx++;
      html += `<div style="${cellStyle()}">
                 <span style="
                   background:${bgColor};
                   color:${txtColor};
                   border-radius:6px;
                   min-width:44px;
                   height:44px;
                   display:flex;
                   align-items:center;
                   justify-content:center;
                   font-size:1.5rem;
                   font-weight:bold;
                 ">${display || "?"}</span>
               </div>`;
    } else {
      html += `<div style="${cellStyle(`color:${getColor(ci)};font-size:1.6rem;`)}">${val ?? ""}</div>`;
    }
  });

  html += `</div>`;
  return html;
}

function buildLongDivisionSqReviewHTML(question, studentValues, mode) {
  const correctAnswers = question.answer || [];
  let inputIndex = 0;

  const norm = (v) =>
    String(v || "")
      .replace(/,/g, "")
      .toLowerCase()
      .trim();

  // Replace _____ with a colored answer span
  function makeAnswerSpan(rawHtml) {
    return rawHtml.replace(/_{3,}/g, () => {
      const filled = norm(studentValues[inputIndex] || "");
      const correct = norm(correctAnswers[inputIndex] || "");
      const isRight = filled === correct;
      const display =
        mode === "correct"
          ? correctAnswers[inputIndex] || "?"
          : studentValues[inputIndex] || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const col =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      return `<span style="display:inline-flex;align-items:center;justify-content:center;
        min-width:18px;height:18px;background:${bg};color:${col};
        border-radius:3px;font-weight:bold;font-size:0.85em;padding:0 2px;margin:1px;">${display}</span>`;
    });
  }

  const gridStyle =
    "display:grid;grid-template-columns:minmax(20px,auto) 2px minmax(70px,auto) 2px minmax(20px,auto);" +
    "row-gap:0px;align-items:stretch;font-size:0.72em;font-weight:bold;" +
    "margin:4px auto;width:max-content;text-align:center;";

  let html = `<div style="${gridStyle}">`;

  question.longDivisionSq.forEach((row) => {
    const leftContent = makeAnswerSpan(row.left || "");
    const rightContent = makeAnswerSpan(row.right || "");
    const insideContent = makeAnswerSpan(row.inside || "");

    html += `<div style="display:flex;align-items:center;justify-content:flex-end;padding-right:4px;">${leftContent}</div>`;
    html += `<div style="${row.leftBracket ? "border-left:2px solid #000;" : ""}"></div>`;

    let mainStyles =
      "padding:2px 0px;text-align:left;position:relative;min-height:26px;display:flex;align-items:center;";
    if (row.topBar) mainStyles += "border-top:2px solid #000;";
    if (row.bottomLine) mainStyles += "border-bottom:2px solid #000;";
    html += `<div style="${mainStyles}"><div style="width:100%;white-space:nowrap;">${insideContent}</div></div>`;

    html += `<div style="${row.rightBracket ? "border-right:2px solid #000;" : ""}"></div>`;
    html += `<div style="display:flex;align-items:center;padding-left:4px;">${rightContent}</div>`;
  });

  html += `</div>`;

  // questionAfter
  if (question.questionAfter) {
    html += `<div style="margin-top:4px;display:flex;align-items:center;gap:2px;flex-wrap:wrap;justify-content:center;font-size:0.72em;font-weight:bold;">`;
    const parts = Array.isArray(question.questionAfter)
      ? question.questionAfter
      : [question.questionAfter];
    parts.forEach((p) => {
      if (typeof p === "string") {
        const pieces = p.split("______");
        pieces.forEach((piece, pi) => {
          if (piece) html += `<span>${piece}</span>`;
          if (pi < pieces.length - 1) {
            const filled = norm(studentValues[inputIndex] || "");
            const correct = norm(correctAnswers[inputIndex] || "");
            const isRight = filled === correct;
            const display =
              mode === "correct"
                ? correctAnswers[inputIndex] || "?"
                : studentValues[inputIndex] || "?";
            const bg =
              mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
            const col =
              mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
            inputIndex++;
            html += `<span style="display:inline-flex;align-items:center;justify-content:center;
              min-width:22px;height:20px;background:${bg};color:${col};
              border-radius:3px;font-weight:bold;font-size:0.85em;padding:0 3px;">${display}</span>`;
          }
        });
      } else if (p.root) {
        html += renderRoot(p.root);
      }
    });
    html += `</div>`;
  }

  return html;
}

function buildTableHTML(question, studentValues, mode) {
  const structure = question.tableStructure;
  const correctAnswers = question.answer || [];

  const totalCols = Math.max(...structure.map((r) => r.length));

  let answerIdx = 0;

  const tableStyle = `
    border-collapse: collapse;
    border: 2px solid black;
    font-size: 0.85em;
    width: auto;
    max-width: 100%;
  `;

  const wrapStyle = `
    display: block;
    background: #fff;
    border-radius: 8px;
    padding: 6px;
    border: 1px solid #ddd;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    max-width: 100%;
  `;

  // Helper: render a fraction object as inline HTML
  function renderFractionCell(frac) {
    const { numerator, denominator } = frac;
    return `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1.1;vertical-align:middle;">
      <span style="border-bottom:1.5px solid currentColor;padding:0 3px;font-size:0.95em;">${numerator}</span>
      <span style="padding:0 3px;font-size:0.95em;">${denominator}</span>
    </span>`;
  }

  let html = `<div style="${wrapStyle}"><table style="${tableStyle}">`;

  structure.forEach((row, rowIndex) => {
    html += `<tr>`;

    if (row.length === 1) {
      html += `<td colspan="${totalCols}"
        style="border:1px solid black;padding:4px 8px;
               text-align:center;font-weight:bold;
               background:#f0f0f0;">
        ${row[0]}
      </td>`;
      html += `</tr>`;
      return;
    }

    row.forEach((cell, cellIndex) => {
      const isHeader = rowIndex === 0 || cellIndex === 0;

      if (cell === "INPUT") {
        const filled = (studentValues[answerIdx] || "").trim().toLowerCase();
        const correct = (correctAnswers[answerIdx] || "").trim().toLowerCase();
        const isRight = filled === correct;
        const display =
          mode === "correct"
            ? correctAnswers[answerIdx] || ""
            : studentValues[answerIdx] || "";

        const bgColor =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const txtColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

        answerIdx++;

        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:50px;">
                   <span style="
                     display:inline-flex;
                     align-items:center;
                     justify-content:center;
                     min-width:40px;
                     height:28px;
                     background:${bgColor};
                     color:${txtColor};
                     border-radius:5px;
                     font-weight:bold;
                     font-size:0.9em;
                   ">${display || "?"}</span>
                 </td>`;
      } else if (cell === "PERCENT_INPUT") {
        const filled = (studentValues[answerIdx] || "").trim().toLowerCase();
        const correct = (correctAnswers[answerIdx] || "").trim().toLowerCase();
        const isRight = filled === correct;
        const display =
          mode === "correct"
            ? correctAnswers[answerIdx] || ""
            : studentValues[answerIdx] || "";

        const bgColor =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const txtColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

        answerIdx++;

        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:50px;">
                   <span style="display:inline-flex;align-items:center;gap:2px;justify-content:center;">
                     <span style="
                       display:inline-flex;align-items:center;justify-content:center;
                       min-width:36px;height:28px;background:${bgColor};color:${txtColor};
                       border-radius:5px;font-weight:bold;font-size:0.9em;
                     ">${display || "?"}</span>
                     <span style="font-weight:bold;font-size:0.9em;">%</span>
                   </span>
                 </td>`;
      } else if (cell === "FRACTION_INPUT") {
        // Two consecutive answers: numerator then denominator
        const filledNum = (studentValues[answerIdx] || "").trim().toLowerCase();
        const correctNum = (correctAnswers[answerIdx] || "")
          .trim()
          .toLowerCase();
        const filledDen = (studentValues[answerIdx + 1] || "")
          .trim()
          .toLowerCase();
        const correctDen = (correctAnswers[answerIdx + 1] || "")
          .trim()
          .toLowerCase();
        const isRight = filledNum === correctNum && filledDen === correctDen;

        const numDisplay =
          mode === "correct"
            ? correctAnswers[answerIdx] || "?"
            : studentValues[answerIdx] || "?";
        const denDisplay =
          mode === "correct"
            ? correctAnswers[answerIdx + 1] || "?"
            : studentValues[answerIdx + 1] || "?";

        const bgColor =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const txtColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

        answerIdx += 2;

        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:50px;">
                   <span style="display:inline-flex;flex-direction:column;align-items:center;
                                background:${bgColor};color:${txtColor};border-radius:5px;
                                padding:3px 6px;font-weight:bold;font-size:0.9em;line-height:1.3;">
                     <span style="border-bottom:1.5px solid ${txtColor};padding:0 3px;">${numDisplay}</span>
                     <span style="padding:0 3px;">${denDisplay}</span>
                   </span>
                 </td>`;
      } else if (cell && typeof cell === "object" && cell.fraction) {
        // Fraction object cell (given value, not input)
        html += `<td style="border:1px solid black;padding:4px 6px;text-align:center;min-width:45px;
                             ${isHeader ? "background:#f0f0f0;font-weight:bold;" : ""}">
                   ${renderFractionCell(cell.fraction)}
                 </td>`;
      } else if (cell === "" && rowIndex > 0 && cellIndex > 0) {
        html += `<td style="border:1px solid black;padding:4px 6px;
                             text-align:center;background:#81D486;
                             min-width:45px;">&nbsp;</td>`;
      } else {
        html += `<td style="border:1px solid black;padding:4px 6px;
                             text-align:center;min-width:45px;
                             ${isHeader ? "background:#f0f0f0;font-weight:bold;" : ""}">
                   ${cell}
                 </td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</table></div>`;
  return html;
}

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

function saveToLocalStorage(key, value) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  storageData[key] = value;
  localStorage.setItem(uniqueKey, JSON.stringify(storageData));
}

function getFromLocalStorage(key) {
  let storageData = JSON.parse(localStorage.getItem(uniqueKey)) || {};
  return storageData[key];
}

// ============================================================
// FETCH & INIT
// ============================================================

fetch("questions.json")
  .then((response) => response.json())
  .then((data) => {
    const urlParams = new URLSearchParams(window.location.search);
    topicName = urlParams.get("topic");

    const selectedTopic = data.topics.find((t) => t.heading === topicName);

    if (selectedTopic) {
      questions = selectedTopic.questions;
      count = questions.length;

      // Load previously saved answers from localStorage
      // Commented out to prevent previous topic answers from auto-selecting
      // const savedAnswers = getFromLocalStorage('Ansgiven')
      // if (savedAnswers && Array.isArray(savedAnswers) && savedAnswers.length === count) {
      //   Ansgiven = savedAnswers
      // } else {
      Ansgiven = new Array(count).fill(null);
      // }

      saveToLocalStorage(topicName + "_totalQuestions", count);

      const headingElement = document.getElementById("heading");
      if (headingElement) {
        headingElement.innerText = topicName || "PS";
      }

      // Load saved question index
      const savedIndex = getFromLocalStorage("currentQuestionIndex");
      if (
        savedIndex !== undefined &&
        savedIndex !== null &&
        savedIndex < count
      ) {
        i = savedIndex;
      }

      loadButtons();
      loadQuestion(i);

      // FIXED: Store ALL topics from the JSON file
      saveToLocalStorage("topics", data.topics);
      saveToLocalStorage(topicName + "_topicData", selectedTopic);
    } else {
      const headingElement = document.getElementById("heading");
      const buttonContainer = document.getElementById("buttonContainer");
      if (headingElement) headingElement.innerText = "Topic not found";
      if (buttonContainer)
        buttonContainer.innerHTML = "No questions available for this topic.";
    }
  });

// ============================================================
// LOAD BUTTONS
// ============================================================

function loadButtons() {
  var buttonContainer = document.getElementById("buttonContainer");
  if (!buttonContainer) {
    console.error("buttonContainer element not found");
    return;
  }

  buttonContainer.innerHTML = "";
  for (var j = 0; j < questions.length; j++) {
    var btn = document.createElement("button");
    btn.className = "btnButton btn smallbtn";
    btn.innerHTML = "Q" + (j + 1);
    btn.setAttribute("onclick", "abc(" + (j + 1) + ")");

    if (getFromLocalStorage(topicName + "_completed")) {
      btn.classList.add("disabled-btn");
      btn.disabled = true;
    }

    buttonContainer.appendChild(btn);
  }
  updateButtonStyles();
}

// ============================================================
// DROPDOWN HELPER
// ============================================================

function createDropdown(optionsArray) {
  const select = document.createElement("select");
  select.className = "answer-input dropdown-input";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select";
  select.appendChild(defaultOption);

  optionsArray.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    handleInputAnswerChange();
  });

  return select;
}

// ============================================================
// RENDER QUESTION TEXT (fractions + HTML)
// ============================================================

function renderQuestionText(questionParts, questionElement) {
  if (!questionElement) {
    console.error("questionElement is null");
    return;
  }

  questionElement.innerHTML = "";

  questionParts.forEach((part) => {
    if (typeof part === "string") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = part;

      if (part.includes("<") && part.includes(">")) {
        while (tempDiv.firstChild) {
          questionElement.appendChild(tempDiv.firstChild);
        }
      } else {
        questionElement.appendChild(document.createTextNode(part));
      }
    } else if (part.fraction) {
      const { whole, numerator, denominator } = part.fraction;

      const span = document.createElement("span");
      span.className = "mixed-fraction";

      if (whole !== undefined && whole !== "") {
        span.innerHTML = `
          <span class="whole">${whole}</span>
          <span class="fraction">
            <span class="numerator">${numerator}</span>
            <span class="denominator">${denominator}</span>
          </span>
        `;
      } else {
        span.innerHTML = `
          <span class="whole">&nbsp;</span>
          <span class="fraction">
            <span class="numerator">${numerator}</span>
            <span class="denominator">${denominator}</span>
          </span>
        `;
      }
      questionElement.appendChild(span);
    } else if (part.root) {
      const span = document.createElement("span");
      if (part.root.value === "______") {
        // Has an input inside — use innerHTML so the input is created, then wire up event
        span.innerHTML = renderRoot(part.root);
        // Wire up the input inside
        const inp = span.querySelector("input");
        if (inp) inp.addEventListener("input", handleInputAnswerChange);
      } else {
        span.innerHTML = renderRoot(part.root);
      }
      questionElement.appendChild(span);
    }
  });
}

// ============================================================
// TABLE QUESTION LOADER
// ============================================================

function loadTableQuestion(randomQuestion, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.style.gap = "15px";
  optionsElement.classList.add("table-question");

  var mainContainer = document.createElement("div");
  mainContainer.style.display = "flex";
  mainContainer.style.flexDirection = "column";
  mainContainer.style.width = "100%";
  mainContainer.style.alignItems = "center";
  mainContainer.style.gap = "15px";

  var questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.width = "100%";
  questionContainer.style.display = "flex";
  questionContainer.style.flexWrap = "wrap";
  questionContainer.style.justifyContent = "center";
  questionContainer.style.alignItems = "center";
  questionContainer.style.gap = "5px";
  questionContainer.style.fontSize = "1.5em";
  questionContainer.style.textAlign = "center";
  questionContainer.style.padding = "0";

  if (randomQuestion.question) {
    if (Array.isArray(randomQuestion.question)) {
      renderQuestionText(randomQuestion.question, questionContainer);
    } else {
      questionContainer.innerHTML = randomQuestion.question;
    }
  }

  var tableContainer = document.createElement("div");
  tableContainer.className = "table-container";
  tableContainer.style.width = "50%";
  tableContainer.style.display = "flex";
  tableContainer.style.justifyContent = "center";
  tableContainer.style.alignItems = "center";

  var table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.border = "2px solid black";
  table.style.fontSize = "1.1em";
  table.style.width = "100%";
  table.style.maxWidth = "90%";

  let inputIndex = 0;

  randomQuestion.tableStructure.forEach((row, rowIndex) => {
    var tr = document.createElement("tr");

    const totalCols = randomQuestion.tableStructure[1]
      ? randomQuestion.tableStructure[1].length
      : row.length;

    if (row.length === 1) {
      var td = document.createElement("td");
      td.setAttribute("colspan", totalCols);
      td.style.border = "2px solid black";
      td.style.padding = "2%";
      td.style.textAlign = "center";
      td.style.fontWeight = "bold";
      td.style.backgroundColor = "#f0f0f0";
      td.innerHTML = row[0];
      tr.appendChild(td);
      table.appendChild(tr);
      return;
    }

    row.forEach((cell, cellIndex) => {
      var td = document.createElement("td");
      td.style.border = "2px solid black";
      td.style.padding = "2%";
      td.style.textAlign = "center";
      td.style.minWidth = "60px";
      td.style.minHeight = "45px";

      if (rowIndex === 0 || cellIndex === 0) {
        td.style.backgroundColor = "#f0f0f0";
        td.style.fontWeight = "bold";
      }

      if (cell === "INPUT") {
        var input = document.createElement("input");
        input.type = "text";
        input.className = "answer-input table-input";
        input.style.width = "55px";
        input.style.height = "35px";
        input.style.textAlign = "center";
        input.style.border = "1px solid #007bff";
        input.style.borderRadius = "6px";
        input.style.fontSize = "1.1em";
        input.style.backgroundColor = "white";

        input.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        td.appendChild(input);
        inputIndex++;
      } else if (cell === "PERCENT_INPUT") {
        // Input box with a fixed % label — student types only the number
        var pctWrap = document.createElement("span");
        pctWrap.style.display = "inline-flex";
        pctWrap.style.alignItems = "center";
        pctWrap.style.gap = "3px";

        var pctInput = document.createElement("input");
        pctInput.type = "text";
        pctInput.className = "answer-input table-input";
        pctInput.style.width = "45px";
        pctInput.style.height = "35px";
        pctInput.style.textAlign = "center";
        pctInput.style.border = "1px solid #007bff";
        pctInput.style.borderRadius = "6px";
        pctInput.style.fontSize = "1.1em";
        pctInput.style.backgroundColor = "white";
        pctInput.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        var pctLabel = document.createElement("span");
        pctLabel.textContent = "%";
        pctLabel.style.fontWeight = "bold";
        pctLabel.style.fontSize = "1.1em";

        pctWrap.appendChild(pctInput);
        pctWrap.appendChild(pctLabel);
        td.appendChild(pctWrap);
        inputIndex++;
      } else if (cell === "FRACTION_INPUT") {
        // Render two input boxes stacked with a fraction line — numerator input / denominator input
        var fracWrap = document.createElement("span");
        fracWrap.className = "mixed-fraction";
        fracWrap.style.justifyContent = "center";

        var fracInner = document.createElement("span");
        fracInner.className = "fraction";

        var numInput = document.createElement("input");
        numInput.type = "text";
        numInput.className = "answer-input table-input fraction-num-input";
        numInput.style.width = "45px";
        numInput.style.height = "30px";
        numInput.style.textAlign = "center";
        numInput.style.border = "1px solid #007bff";
        numInput.style.borderRadius = "4px";
        numInput.style.fontSize = "1em";
        numInput.style.backgroundColor = "white";
        numInput.style.display = "block";
        numInput.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        var numSpan = document.createElement("span");
        numSpan.className = "numerator";
        numSpan.style.borderBottom = "2px solid #000";
        numSpan.style.padding = "0 2px";
        numSpan.appendChild(numInput);

        var denInput = document.createElement("input");
        denInput.type = "text";
        denInput.className = "answer-input table-input fraction-den-input";
        denInput.style.width = "45px";
        denInput.style.height = "30px";
        denInput.style.textAlign = "center";
        denInput.style.border = "1px solid #007bff";
        denInput.style.borderRadius = "4px";
        denInput.style.fontSize = "1em";
        denInput.style.backgroundColor = "white";
        denInput.style.display = "block";
        denInput.addEventListener("input", function () {
          handleInputAnswerChange();
        });

        var denSpan = document.createElement("span");
        denSpan.className = "denominator";
        denSpan.style.padding = "0 2px";
        denSpan.appendChild(denInput);

        fracInner.appendChild(numSpan);
        fracInner.appendChild(denSpan);
        fracWrap.appendChild(fracInner);
        td.appendChild(fracWrap);
        inputIndex += 2;
      } else if (cell && typeof cell === "object" && cell.fraction) {
        // Render fraction object as stacked fraction display
        var fracSpan = document.createElement("span");
        fracSpan.style.display = "inline-flex";
        fracSpan.style.flexDirection = "column";
        fracSpan.style.alignItems = "center";
        fracSpan.style.lineHeight = "1.1";
        fracSpan.style.verticalAlign = "middle";
        fracSpan.innerHTML =
          '<span style="border-bottom:1.5px solid currentColor;padding:0 3px;font-size:0.95em;">' +
          cell.fraction.numerator +
          '</span><span style="padding:0 3px;font-size:0.95em;">' +
          cell.fraction.denominator +
          "</span>";
        td.appendChild(fracSpan);
      } else if (cell === "" && rowIndex > 0 && cellIndex > 0) {
        td.style.backgroundColor = "#81D486";
        td.innerHTML = "&nbsp;";
      } else {
        td.innerHTML = cell;
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  tableContainer.appendChild(table);
  mainContainer.appendChild(questionContainer);
  mainContainer.appendChild(tableContainer);
  optionsElement.appendChild(mainContainer);

  var previouslyEntered = Ansgiven[index];
  if (previouslyEntered && Array.isArray(previouslyEntered)) {
    let inputs = tableContainer.querySelectorAll(".table-input");
    inputs.forEach((input, idx) => {
      if (
        previouslyEntered[idx] !== undefined &&
        previouslyEntered[idx] !== ""
      ) {
        input.value = previouslyEntered[idx];
      }
    });
  }
}

// ============================================================
// ADDITION QUESTION RENDERER
// ============================================================

function renderAdditionQuestion(question, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.justifyContent = "center";
  optionsElement.style.alignItems = "center";
  optionsElement.style.gridTemplateColumns = "";

  const cols = Math.max(
    (question.layout.carry || []).length,
    question.layout.top.length,
    question.layout.bottom.length,
    question.layout.result.length,
  );

  const grid = document.createElement("div");
  grid.className = "addition-grid";
  grid.style.setProperty("--cols", cols);

  let inputIndex = 0;

  const normalize = (arr = []) => {
    const copy = [...arr];
    while (copy.length < cols) copy.unshift(null);
    return copy;
  };

  const carry = normalize(question.layout.carry || new Array(cols).fill(null));
  const place = question.layout.place ? normalize(question.layout.place) : null;
  const top = normalize(question.layout.top);
  const bottom = normalize(question.layout.bottom);
  const result = normalize(question.layout.result);

  const colColors = [
    "#e53935",
    "#7b1fa2",
    "#212121",
    "#e65100",
    "#1565c0",
    "#2e7d32",
  ];
  function getColor(colIndex) {
    return colColors[colIndex % colColors.length];
  }

  /* Carry Row */
  grid.appendChild(document.createElement("div"));
  carry.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell carry";
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input carry-input answer-input";
      input.maxLength = 2;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
    }
    grid.appendChild(cell);
  });

  /* Place Value Row */
  if (place) {
    grid.appendChild(document.createElement("div"));
    place.forEach((val, colIdx) => {
      const cell = document.createElement("div");
      cell.className = "cell place";
      cell.innerText = val ?? "";
      cell.style.color = getColor(colIdx);
      grid.appendChild(cell);
    });
  }

  /* Top Row */
  grid.appendChild(document.createElement("div"));
  top.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell digit";
    cell.style.color = getColor(colIdx);
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input answer-input";
      input.maxLength = 1;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
    }
    grid.appendChild(cell);
  });

  /* Bottom Row */
  const signCell = document.createElement("div");
  signCell.className = "cell plus";
  signCell.innerText = question.layout.sign || "+";
  grid.appendChild(signCell);

  bottom.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell digit";
    cell.style.color = getColor(colIdx);
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input answer-input";
      input.maxLength = 1;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
    }
    grid.appendChild(cell);
  });

  /* Separator Line */
  const line = document.createElement("div");
  line.className = "addition-line";
  line.style.gridColumn = `1 / span ${cols + 1}`;
  grid.appendChild(line);

  /* Result Row */
  grid.appendChild(document.createElement("div"));
  result.forEach((val, colIdx) => {
    const cell = document.createElement("div");
    cell.className = "cell result";
    if (val === "_") {
      const input = document.createElement("input");
      input.className = "addition-input answer-input";
      input.maxLength = 1;
      input.addEventListener("input", handleInputAnswerChange);
      cell.appendChild(input);
    } else {
      cell.innerText = val ?? "";
      cell.style.color = getColor(colIdx);
    }
    grid.appendChild(cell);
  });

  optionsElement.appendChild(grid);

  /* Restore saved answers */
  const saved = Ansgiven[index];
  if (saved && Array.isArray(saved)) {
    grid
      .querySelectorAll(".addition-input:not(.carry-input)")
      .forEach((inp, i) => {
        inp.value = saved[i] || "";
      });
  }
}

// ============================================================
// LOAD QUESTION ROUTER
// ============================================================

function loadQuestion(index) {
  var randomQuestion = questions[index];

  if (!randomQuestion) {
    console.error("No question found at index:", index);
    return;
  }

  var questionElement = document.getElementById("question");
  if (!questionElement) {
    console.error("question element not found");
    return;
  }

  if (
    (randomQuestion.input && Array.isArray(randomQuestion.input)) ||
    randomQuestion.displayType === "table"
  ) {
    questionElement.innerHTML = "";
  } else {
    if (Array.isArray(randomQuestion.question)) {
      renderQuestionText(randomQuestion.question, questionElement);
    } else {
      questionElement.innerHTML = randomQuestion.question;
    }
  }

  var picDiv = document.getElementById("picdiv");
  if (picDiv) {
    picDiv.innerHTML = "";

    if (randomQuestion.image) {
      const element = document.querySelector(".question-image-area");
      if (element) element.style.display = "block";
      picDiv.style.display = "flex";
      const questionQuentent = document.querySelector(".question-content");
      if (questionQuentent) questionQuentent.style.display = "flex";
      var questionImage = document.createElement("img");
      questionImage.src = randomQuestion.image;
      questionImage.alt = "Question Image";
      questionImage.style.maxWidth = "90%";
      questionImage.style.maxHeight = "250px";
      questionImage.style.objectFit = "contain";
      questionImage.style.borderRadius = "8px";
      picDiv.appendChild(questionImage);
    } else {
      picDiv.style.display = "none";
      const element = document.querySelector(".question-image-area");
      if (element) element.style.display = "none";
      const questionQuentent = document.querySelector(".question-content");
      if (questionQuentent) questionQuentent.style.display = "block";
    }
  }

  if (randomQuestion.questionSound) {
    var soundButton = document.createElement("button");
    soundButton.className = "btn btn-sound";
    soundButton.innerText = "🔊 Play Sound";
    soundButton.onclick = function () {
      var sound = new Audio(randomQuestion.questionSound);
      sound.play();
    };
    if (
      !(
        (randomQuestion.input && Array.isArray(randomQuestion.input)) ||
        randomQuestion.displayType === "table"
      )
    ) {
      questionElement.appendChild(soundButton);
    }
  }

  var optionsElement = document.getElementById("options");
  if (!optionsElement) {
    console.error("options element not found");
    return;
  }

  optionsElement.innerHTML = "";

  if (randomQuestion.type === "addition") {
    renderAdditionQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "lcm-division") {
    renderLCMDivision(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "long-division") {
    optionsElement.style.display = "flex";
    optionsElement.style.justifyContent = "center";
    optionsElement.style.alignItems = "center";
    renderLongDivision(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.type === "tree") {
    renderTreeQuestion(randomQuestion, optionsElement, index);
    updateButtonVisibility();
    updateButtonStyles();
    updateButtonText();
    return;
  }

  if (randomQuestion.longDivisionSq) {
    loadInputQuestion(randomQuestion, optionsElement, index);
  } else if (randomQuestion.input && Array.isArray(randomQuestion.input)) {
    loadInputQuestion(randomQuestion, optionsElement, index);
  } else if (randomQuestion.tableStructure) {
    loadTableQuestion(randomQuestion, optionsElement, index);
  } else if (randomQuestion.options) {
    loadOptionQuestion(randomQuestion, optionsElement, index);
  }

  updateButtonVisibility();
  updateButtonStyles();
  updateButtonText();
}

// ============================================================
// INPUT QUESTION LOADER — MERGED (File 1 + File 2 fraction inputs)
// ============================================================

function loadInputQuestion(randomQuestion, optionsElement, index) {
  /* ---------- TABLE QUESTIONS ---------- */
  if (randomQuestion.displayType === "table" && randomQuestion.tableStructure) {
    loadTableQuestion(randomQuestion, optionsElement, index);
    return;
  }

  optionsElement.innerHTML = "";
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.classList.add("input-question");

  const questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  questionContainer.style.display = "flex";
  questionContainer.style.flexWrap = "wrap";
  questionContainer.style.justifyContent = "center";
  questionContainer.style.alignItems = "center";
  questionContainer.style.gap = "6px";
  questionContainer.style.fontSize = "1.4em";
  questionContainer.style.fontWeight = "bold";
  questionContainer.style.marginBottom = "20px";

  let inputIndex = 0;

  /* =========================================================
     ARRAY QUESTION — fractions with blank whole/num/den inputs
  ========================================================= */
  if (Array.isArray(randomQuestion.question)) {
    randomQuestion.question.forEach((part) => {
      if (typeof part === "string") {
        // Split by <br> first
        const brParts = part.split("<br>");

        brParts.forEach((line, lineIdx) => {
          // Split each line by BOTH dropdown, superscript, and normal placeholders
          const tokenRegex =
            /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g;
          const pieces = line.split(tokenRegex);

          pieces.forEach((piece) => {
            // Dropdown
            if (
              piece === "<drop>______</drop>" &&
              randomQuestion.type === "drop-down"
            ) {
              // Support per-dropdown options via `dropdowns` object (keyed by inputIndex)
              // or array (indexed by inputIndex), fallback to `operators`
              var dropOptions;
              var dd = randomQuestion.dropdowns;
              if (
                dd &&
                typeof dd === "object" &&
                !Array.isArray(dd) &&
                dd[String(inputIndex)]
              ) {
                dropOptions = dd[String(inputIndex)];
              } else if (Array.isArray(dd) && dd[inputIndex] !== undefined) {
                dropOptions = dd[inputIndex];
              } else if (Array.isArray(randomQuestion.operators)) {
                dropOptions = randomQuestion.operators;
              } else {
                dropOptions = [];
              }

              const select = document.createElement("select");
              select.className = "answer-input dropdown-input";
              const def = document.createElement("option");
              def.value = "";
              def.textContent = "Select";
              select.appendChild(def);
              dropOptions.forEach((op) => {
                const opt = document.createElement("option");
                opt.value = op;
                opt.textContent = op;
                select.appendChild(opt);
              });
              select.addEventListener("change", handleInputAnswerChange);
              questionContainer.appendChild(select);
              inputIndex++;
            }

            // Superscript input
            else if (piece === "<sup>______</sup>") {
              const supWrapper = document.createElement("sup");
              const input = document.createElement("input");
              input.type = "text";
              input.className = "answer-input sup-input";
              input.style.width = "45px";
              input.style.height = "30px";
              input.style.fontSize = "0.8em";
              input.style.textAlign = "center";
              input.style.border = "1px solid blue";
              input.style.borderRadius = "4px";
              input.style.padding = "2px";
              input.addEventListener("input", handleInputAnswerChange);
              supWrapper.appendChild(input);
              questionContainer.appendChild(supWrapper);
              inputIndex++;
            }

            // Normal input placeholder
            else if (piece === "______") {
              if (inputIndex < randomQuestion.input.length) {
                addInputField(
                  questionContainer,
                  randomQuestion.input[inputIndex],
                );
                inputIndex++;
              }
            }

            // Text
            else if (piece.trim()) {
              const span = document.createElement("span");
              span.innerHTML = piece;
              questionContainer.appendChild(span);
            }
          });

          // Line break between <br> splits
          if (lineIdx < brParts.length - 1) {
            questionContainer.appendChild(document.createElement("br"));
            const lb = document.createElement("div");
            lb.style.flexBasis = "100%";
            questionContainer.appendChild(lb);
          }
        });
      }

      // ── FRACTION PART — supports blank whole, numerator (array or string), denominator ──
      else if (part.fraction) {
        const { whole, numerator, denominator } = part.fraction;

        const span = document.createElement("span");
        span.className = "mixed-fraction";

        const wholeSpan = document.createElement("span");
        wholeSpan.className = "whole";

        const fractionSpan = document.createElement("span");
        fractionSpan.className = "fraction";

        const numeratorSpan = document.createElement("span");
        numeratorSpan.className = "numerator";

        const denominatorSpan = document.createElement("span");
        denominatorSpan.className = "denominator";

        // Whole: blank or fixed
        if (whole === "______") {
          wholeSpan.innerHTML = "";
          let input = createInputElement(randomQuestion.input[inputIndex]);
          wholeSpan.appendChild(input);
          inputIndex++;
        } else {
          wholeSpan.innerHTML = whole ? whole : "&nbsp;";
        }

        // Numerator: array of items, blank, or fixed
        if (Array.isArray(numerator)) {
          numerator.forEach((item) => {
            if (item === "______") {
              numeratorSpan.appendChild(
                createInputElement(randomQuestion.input[inputIndex]),
              );
              inputIndex++;
            } else {
              const opSpan = document.createElement("span");
              opSpan.textContent = " " + item + " ";
              opSpan.style.cssText = "font-weight:bold;font-size:0.9em;";
              numeratorSpan.appendChild(opSpan);
            }
          });
        } else if (numerator === "______") {
          numeratorSpan.appendChild(
            createInputElement(randomQuestion.input[inputIndex]),
          );
          inputIndex++;
        } else {
          numeratorSpan.innerHTML = numerator;
        }

        // Denominator: blank or fixed
        if (denominator === "______") {
          let input = createInputElement(randomQuestion.input[inputIndex]);
          denominatorSpan.appendChild(input);
          inputIndex++;
        } else {
          denominatorSpan.innerHTML = denominator;
        }

        fractionSpan.appendChild(numeratorSpan);
        fractionSpan.appendChild(denominatorSpan);
        span.appendChild(wholeSpan);
        span.appendChild(fractionSpan);
        questionContainer.appendChild(span);
      } else if (part.root) {
        // Root object — render √ or ∛ with overline
        const span = document.createElement("span");
        if (part.root.value === "______") {
          span.innerHTML = renderRoot(part.root);
          const inp = span.querySelector("input");
          if (inp) {
            inp.addEventListener("input", handleInputAnswerChange);
            inputIndex++;
          }
        } else {
          span.innerHTML = renderRoot(part.root);
        }
        questionContainer.appendChild(span);
      }
    });
  } else if (typeof randomQuestion.question === "string") {
    /* =========================================================
     STRING QUESTION — simple inputs + dropdowns
  ========================================================= */
    const brParts = randomQuestion.question.split("<br>");

    brParts.forEach((line, lineIdx) => {
      const tokenRegex = /(<sup>______<\/sup>|<drop>______<\/drop>|______)/g;
      const parts = line.split(tokenRegex);

      parts.forEach((part) => {
        if (
          part === "<drop>______</drop>" &&
          randomQuestion.type === "drop-down"
        ) {
          // Support per-dropdown options via `dropdowns` object (keyed by inputIndex)
          // or array (indexed by inputIndex), fallback to `operators`
          var dropOptions;
          var dd = randomQuestion.dropdowns;
          if (
            dd &&
            typeof dd === "object" &&
            !Array.isArray(dd) &&
            dd[String(inputIndex)]
          ) {
            dropOptions = dd[String(inputIndex)];
          } else if (Array.isArray(dd) && dd[inputIndex] !== undefined) {
            dropOptions = dd[inputIndex];
          } else if (Array.isArray(randomQuestion.operators)) {
            dropOptions = randomQuestion.operators;
          } else {
            dropOptions = [];
          }

          const select = document.createElement("select");
          select.className = "answer-input dropdown-input";
          const def = document.createElement("option");
          def.value = "";
          def.textContent = "Select";
          select.appendChild(def);
          dropOptions.forEach((op) => {
            const opt = document.createElement("option");
            opt.value = op;
            opt.textContent = op;
            select.appendChild(opt);
          });
          select.addEventListener("change", handleInputAnswerChange);
          questionContainer.appendChild(select);
          inputIndex++;
        } else if (part === "<sup>______</sup>") {
          const supWrapper = document.createElement("sup");
          const input = document.createElement("input");
          input.type = "text";
          input.className = "answer-input sup-input";
          input.style.width = "45px";
          input.style.height = "30px";
          input.style.fontSize = "0.8em";
          input.style.textAlign = "center";
          input.style.border = "1px solid blue";
          input.style.borderRadius = "4px";
          input.style.padding = "2px";
          input.addEventListener("input", handleInputAnswerChange);
          supWrapper.appendChild(input);
          questionContainer.appendChild(supWrapper);
          inputIndex++;
        } else if (part === "______") {
          if (inputIndex < randomQuestion.input.length) {
            addInputField(questionContainer, randomQuestion.input[inputIndex]);
            inputIndex++;
          }
        } else if (part.trim()) {
          const span = document.createElement("span");
          span.innerHTML = part;
          questionContainer.appendChild(span);
        }
      });

      if (lineIdx < brParts.length - 1) {
        questionContainer.appendChild(document.createElement("br"));
        const lb = document.createElement("div");
        lb.style.flexBasis = "100%";
        questionContainer.appendChild(lb);
      }
    });
  }

  // ── longDivisionSq renderer ──────────────────────────────────────────────
  if (randomQuestion.longDivisionSq) {
    const ldWrapper = document.createElement("div");
    ldWrapper.style.cssText =
      "display:grid;grid-template-columns:minmax(40px,auto) 4px minmax(130px,auto) 4px minmax(40px,auto);" +
      "row-gap:0px;align-items:stretch;font-size:1.05em;font-weight:bold;" +
      "margin:15px auto;width:max-content;text-align:center;";

    let ldHtml = "";
    randomQuestion.longDivisionSq.forEach((row) => {
      ldHtml += `<div style="display:flex;align-items:center;justify-content:flex-end;padding-right:10px;">${row.left || ""}</div>`;
      ldHtml += `<div style="${row.leftBracket ? "border-left:3px solid #000;" : ""}"></div>`;
      let mainStyles =
        "padding:5px 0px;text-align:left;position:relative;min-height:55px;display:flex;align-items:center;";
      if (row.topBar) mainStyles += "border-top:3px solid #000;";
      if (row.bottomLine) mainStyles += "border-bottom:3px solid #000;";
      ldHtml += `<div style="${mainStyles}"><div style="width:100%;white-space:nowrap;">${row.inside || ""}</div></div>`;
      ldHtml += `<div style="${row.rightBracket ? "border-right:3px solid #000;" : ""}"></div>`;
      ldHtml += `<div style="display:flex;align-items:center;padding-left:10px;">${row.right || ""}</div>`;
    });

    // Replace _____ placeholders with input boxes
    ldHtml = ldHtml.replace(/_{3,}/g, () => {
      const id = inputIndex;
      inputIndex++;
      return `<input type="text" class="answer-input" autocomplete="off"
        style="width:40px;height:40px;border:3px solid #ccc;border-radius:6px;
               font-size:1.1em;font-weight:bold;text-align:center;background:white;
               outline:none;padding:0;margin:2px;" />`;
    });

    ldWrapper.innerHTML = ldHtml;
    questionContainer.appendChild(ldWrapper);

    // questionAfter — rendered below the grid
    if (randomQuestion.questionAfter) {
      const afterDiv = document.createElement("div");
      afterDiv.style.cssText =
        "flex-basis:100%;margin-top:10px;display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:center;";
      const parts = Array.isArray(randomQuestion.questionAfter)
        ? randomQuestion.questionAfter
        : [randomQuestion.questionAfter];
      parts.forEach((p) => {
        if (typeof p === "string") {
          // Replace ______ with input
          const pieces = p.split("______");
          pieces.forEach((piece, pi) => {
            if (piece) {
              const s = document.createElement("span");
              s.innerHTML = piece;
              afterDiv.appendChild(s);
            }
            if (pi < pieces.length - 1) {
              const inp = document.createElement("input");
              inp.type = "text";
              inp.className = "answer-input";
              inp.style.cssText =
                "width:60px;height:36px;border:2px solid #007bff;border-radius:6px;" +
                "font-size:1em;font-weight:bold;text-align:center;background:white;";
              inp.addEventListener("input", handleInputAnswerChange);
              afterDiv.appendChild(inp);
              inputIndex++;
            }
          });
        } else if (p.root) {
          const s = document.createElement("span");
          s.innerHTML = renderRoot(p.root);
          afterDiv.appendChild(s);
        }
      });
      questionContainer.appendChild(afterDiv);
    }
  }

  optionsElement.appendChild(questionContainer);

  /* Restore previous answers */
  const previous = Ansgiven[index];
  if (Array.isArray(previous)) {
    const inputs = questionContainer.querySelectorAll(".answer-input");
    inputs.forEach((el, i) => {
      if (previous[i] !== undefined) {
        el.value = previous[i];
      }
    });
  }
}

// ============================================================
// INPUT ELEMENT HELPERS
// ============================================================

function addInputField(container, inputField) {
  let inputElement = createInputElement(inputField);
  container.appendChild(inputElement);
}

function createInputElement(inputField) {
  let inputElement = document.createElement("input");
  inputElement.type = "text";
  inputElement.className = "answer-input";
  inputElement.style.padding = "8px";
  inputElement.style.fontSize = "1em";
  inputElement.style.border = "2px solid #ccc";
  inputElement.style.borderRadius = "6px";
  inputElement.style.textAlign = "center";
  inputElement.style.width = "80px";
  inputElement.style.maxWidth = "80px";

  inputElement.addEventListener("input", function () {
    handleInputAnswerChange();
  });

  return inputElement;
}

// ============================================================
// OPTION QUESTION LOADER — with textParts + fraction support
// ============================================================

function loadOptionQuestion(randomQuestion, optionsElement, index) {
  var hasImageOptions = randomQuestion.options.some((option) => option.image);
  var hasTextOnlyOptions = randomQuestion.options.every(
    (option) => !option.image,
  );

  if (hasImageOptions) {
    optionsElement.style.display = "grid";
    optionsElement.style.gridTemplateColumns = "repeat(2, 1fr)";
    optionsElement.style.gap = "1rem";
    optionsElement.style.justifyContent = "center";
    optionsElement.classList.remove("text-only");
  } else if (hasTextOnlyOptions) {
    optionsElement.classList.add("text-only");
    optionsElement.classList.remove("input-question");
  }

  var selectedLi = null;

  randomQuestion.options.forEach(function (option, idx) {
    var li = document.createElement("li");
    li.classList.add("option-container");
    li.setAttribute("onclick", "optionContainer()");
    li.onclick = function () {
      if (selectedLi) selectedLi.style.border = "";
      selectedLi = li;
    };

    var radioButton = document.createElement("input");
    radioButton.type = "radio";
    radioButton.name = "answer";
    radioButton.value = idx;
    radioButton.style.display = "none";

    if (option.image) {
      var optionWithImage = document.getElementById("options");
      if (optionWithImage) optionWithImage.style.gap = "1rem";
      var optionImage = document.createElement("img");
      optionImage.src = option.image;
      optionImage.alt = "Option Image";
      optionImage.style.width = "100%";
      optionImage.style.maxHeight = "100px";
      optionImage.style.cursor = "pointer";
      optionImage.style.border = "3px solid black";

      optionImage.onclick = function () {
        radioButton.checked = true;
        optionsElement.querySelectorAll("img").forEach((img) => {
          img.style.border = "3px solid black";
        });
        optionImage.style.border = "3px solid #007bff";
        handleAnswerChange();
      };

      optionImage.onmouseover = function () {
        if (option.sound) playOptionSound(option.sound);
      };

      li.appendChild(optionImage);
    } else {
      var optionWithText = document.getElementById("options");
      if (optionWithText) optionWithText.style.display = "grid";

      var optionTextButton = document.createElement("button");
      optionTextButton.className = "btnOption";

      // ── textParts support (mixed text + fraction) ──
      if (option.textParts) {
        option.textParts.forEach((part) => {
          if (typeof part === "string") {
            optionTextButton.innerHTML += part;
          } else if (part.fraction) {
            const { whole, numerator, denominator } = part.fraction;
            optionTextButton.innerHTML += `
              <span class="mixed-fraction">
                <span class="whole">${whole || ""}</span>
                <span class="fraction">
                  <span class="numerator">${numerator}</span>
                  <span class="denominator">${denominator}</span>
                </span>
              </span>
            `;
          }
        });
      }
      // ── fraction-only option ──
      else if (option.fraction) {
        const { whole, numerator, denominator } = option.fraction;
        optionTextButton.innerHTML = `
          <span class="mixed-fraction">
            <span class="whole">${whole || ""}</span>
            <span class="fraction">
              <span class="numerator">${numerator}</span>
              <span class="denominator">${denominator}</span>
            </span>
          </span>
        `;
      }
      // ── plain text ──
      else {
        optionTextButton.innerHTML = option.text;
      }

      optionTextButton.onclick = function () {
        radioButton.checked = true;
        var allOptionButtons = document.querySelectorAll(".btnOption");
        allOptionButtons.forEach((btn) => {
          btn.style.backgroundColor = "";
          btn.style.border = "";
        });
        optionTextButton.style.backgroundColor = "#e3f2fd";
        optionTextButton.style.border = "2px solid #007bff";
        optionTextButton.style.color = "black";
        handleAnswerChange();
      };

      li.appendChild(optionTextButton);
    }

    li.appendChild(radioButton);
    optionsElement.appendChild(li);
  });

  // Restore previously selected answer
  var previouslySelected = Ansgiven[index];
  if (previouslySelected !== null && previouslySelected !== undefined) {
    var previouslySelectedElement = optionsElement.querySelector(
      'input[name="answer"][value="' + previouslySelected + '"]',
    );
    if (previouslySelectedElement) {
      previouslySelectedElement.checked = true;
      var previouslySelectedLi = previouslySelectedElement.closest("li");
      if (previouslySelectedLi) {
        selectedLi = previouslySelectedLi;
        var textButton = previouslySelectedLi.querySelector(".btnOption");
        if (textButton) {
          textButton.style.backgroundColor = "#e3f2fd";
          textButton.style.border = "2px solid #007bff";
          textButton.style.color = "black";
        }
        var img = previouslySelectedLi.querySelector("img");
        if (img) {
          optionsElement
            .querySelectorAll("img")
            .forEach((im) => (im.style.border = "3px solid black"));
          img.style.border = "3px solid #007bff";
        }
      }
    }
  }
}

// ============================================================
// ANSWER CHANGE HANDLERS
// ============================================================

function handleInputAnswerChange() {
  const subbtn = document.getElementById("subbtn");
  const nextbtn = document.getElementById("nextbtn");
  if (subbtn) subbtn.style.display = "inline-block";
  if (nextbtn) nextbtn.style.display = "none";
}

function playOptionSound(option) {
  var sound = new Audio(option);
  sound.play();
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getOptionLabel(option) {
  if (option.endsWith && option.endsWith(".mp3")) {
    var label = option.split("/").pop().replace(".mp3", "");
    return capitalizeFirstLetter(label);
  }
  return option.text || option;
}

function handleAnswerChange() {
  const subbtn = document.getElementById("subbtn");
  const nextbtn = document.getElementById("nextbtn");
  if (subbtn) subbtn.style.display = "inline-block";
  if (nextbtn) nextbtn.style.display = "none";
}

// ============================================================
// NAVIGATION
// ============================================================

function newques() {
  saveCurrentAnswer();
  saveToLocalStorage("currentQuestionIndex", i + 1);

  if (i === count - 1) {
    const questiondiv = document.getElementById("questiondiv");
    if (questiondiv) questiondiv.style.textAlign = "center";

    displayResults();

    const buttonContainer = document.getElementById("buttonContainer");
    if (buttonContainer) buttonContainer.style.display = "none";

    saveToLocalStorage("currentQuestionIndex", null);
  } else {
    i++;
    loadQuestion(i);
    const result = document.getElementById("result");
    const subbtn = document.getElementById("subbtn");
    const nextbtn = document.getElementById("nextbtn");

    if (result) result.innerHTML = "";
    if (subbtn) subbtn.style.display = "inline-block";
    if (nextbtn) nextbtn.style.display = "none";

    updateButtonVisibility();
    updateButtonStyles();
  }
}

// ============================================================
// SAVE CURRENT ANSWER
// ============================================================

function saveCurrentAnswer() {
  var currentQuestion = questions[i];

  if (currentQuestion.type === "addition") {
    var inputs = document.querySelectorAll(".addition-input:not(.carry-input)");
    var inputAnswers = [];
    var hasAnswer = false;
    inputs.forEach(function (input) {
      var value = input.value.trim();
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });
    Ansgiven[i] = hasAnswer ? inputAnswers : null;
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.type === "lcm-division") {
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.type === "long-division") {
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.type === "tree") {
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (
    currentQuestion.displayType === "table" &&
    currentQuestion.tableStructure
  ) {
    var inputs = document.querySelectorAll(".table-input");
    var inputAnswers = [];
    var hasAnswer = false;
    inputs.forEach(function (input) {
      var value = input.value.trim().toLowerCase().replace(/,/g, "");
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });
    Ansgiven[i] = hasAnswer ? inputAnswers : null;
    saveToLocalStorage("Ansgiven", Ansgiven);
    return;
  }

  if (currentQuestion.input && Array.isArray(currentQuestion.input)) {
    var inputs = document.querySelectorAll(".answer-input, .dropdown-input");
    var inputAnswers = [];
    var hasAnswer = false;

    inputs.forEach(function (input) {
      var value = input.value.trim().toLowerCase().replace(/,/g, "");
      inputAnswers.push(value);
      if (value !== "") hasAnswer = true;
    });

    Ansgiven[i] = hasAnswer ? inputAnswers : null;
  } else {
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    if (selectedAnswer) {
      Ansgiven[i] = parseInt(selectedAnswer.value);
    } else {
      Ansgiven[i] = null;
    }
  }

  console.log("score", score);
  saveToLocalStorage("Ansgiven", Ansgiven);
}

// ============================================================
// FORMAT FRACTION FOR DISPLAY (review panels)
// ============================================================

function formatFractionForDisplay(option) {
  if (option && option.fraction) {
    const { whole, numerator, denominator } = option.fraction;
    let fractionHTML = '<span class="display-fraction">';
    if (whole !== undefined && whole !== "" && whole !== null) {
      fractionHTML += `
        <span class="whole-part">${whole}</span>
        <span class="fraction-part">
          <span class="numerator">${numerator}</span>
          <span class="denominator">${denominator}</span>
        </span>
      `;
    } else {
      fractionHTML += `
        <span class="fraction-part">
          <span class="numerator">${numerator}</span>
          <span class="denominator">${denominator}</span>
        </span>
      `;
    }
    fractionHTML += "</span>";
    return fractionHTML;
  }
  return option.text || option;
}

// ============================================================
// STEP VALIDATION HELPERS (from PS1)
// ============================================================

function normalizeAnswer(answer) {
  const value = (answer || "").trim();
  const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (numberPattern.test(value)) return String(Number(value));
  return value.toLowerCase();
}

function compareAnswers(userAnswer, correctAnswer) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

function validatePairs(values, allowed) {
  const counts = {};
  values.forEach(function (v) {
    var k = String(Number(v));
    counts[k] = (counts[k] || 0) + 1;
  });
  for (var key in allowed) {
    if ((counts[key] || 0) !== allowed[key]) return false;
  }
  return true;
}

function buildPerSlotCorrect(answers, correctAnswers, question) {
  if (!correctAnswers) return answers.map(() => null);

  var result = new Array(answers.length).fill(false);
  var unordered =
    question.unorderedIndices && question.unorderedIndices.length
      ? question.unorderedIndices
      : [];
  var checked = new Set();

  if (question.stepValidation) {
    question.stepValidation.forEach(function (step) {
      if (!answers) return;
      var vals = answers.slice(step.start, step.end).map(Number);
      var isValid = false;

      if (step.type === "count") {
        isValid = validatePairs(vals, step.rule);
      } else if (step.type === "triples") {
        // Each group of 3 must match one of the allowed triples (any order within group)
        var groupSize = 3;
        var numGroups = step.rule.length;
        var groups = [];
        for (var g = 0; g < numGroups; g++) {
          groups.push(vals.slice(g * groupSize, (g + 1) * groupSize));
        }
        // Each group must match one rule; each rule used at most once
        var usedRules = new Array(step.rule.length).fill(false);
        isValid = groups.every(function (group) {
          return step.rule.some(function (r, ri) {
            if (usedRules[ri]) return false;
            var sortedGroup = [...group].sort((a, b) => a - b);
            var sortedRule = [...r].map(Number).sort((a, b) => a - b);
            if (JSON.stringify(sortedGroup) === JSON.stringify(sortedRule)) {
              usedRules[ri] = true;
              return true;
            }
            return false;
          });
        });
      } else if (step.type === "pairs") {
        var groupSize = step.rule[0].length;
        var numGroups = step.rule.length;
        var groups = [];
        for (var g = 0; g < numGroups; g++) {
          groups.push(vals.slice(g * groupSize, (g + 1) * groupSize));
        }
        isValid = groups.every(function (group) {
          return step.rule.some(function (r) {
            var sortedGroup = [...group].sort((a, b) => a - b);
            var sortedRule = [...r].map(Number).sort((a, b) => a - b);
            return JSON.stringify(sortedGroup) === JSON.stringify(sortedRule);
          });
        });
      } else if (step.type === "anyOrder") {
        var sortedVals = [...vals].map(Number).sort((a, b) => a - b);
        var sortedRule = [...step.rule].map(Number).sort((a, b) => a - b);
        isValid = JSON.stringify(sortedVals) === JSON.stringify(sortedRule);
      }

      for (var j = step.start; j < step.end; j++) {
        result[j] = isValid;
        checked.add(j);
      }
    });
  }

  // Ordered slots: direct comparison
  answers.forEach(function (val, idx) {
    if (unordered.indexOf(idx) === -1 && !checked.has(idx)) {
      result[idx] = compareAnswers(val, correctAnswers[idx]);
    }
  });

  // Unordered slots: check as a set
  if (unordered.length) {
    var givenVals = unordered
      .map(function (idx) {
        return normalizeAnswer(answers[idx]);
      })
      .sort();
    var correctVals = unordered
      .map(function (idx) {
        return normalizeAnswer(correctAnswers[idx]);
      })
      .sort();
    var setMatch = JSON.stringify(givenVals) === JSON.stringify(correctVals);
    unordered.forEach(function (idx) {
      if (!checked.has(idx)) result[idx] = setMatch;
    });
  }

  return result;
}

// ============================================================
// RENDER ANSWER SPAN (colored box for review)
// ============================================================

function renderAnswerSpan(val, correct) {
  var border = correct === null ? "#444" : correct ? "#4CAF50" : "#f44336";
  var color = correct === null ? "#111" : correct ? "#155724" : "#721c24";
  var bg = correct === null ? "#f5f5f5" : correct ? "#d4edda" : "#f8d7da";
  return `<span style="display:inline-flex;align-items:center;justify-content:center;
    min-width:28px;padding:0 5px;height:32px;
    border:2px solid ${border};border-radius:5px;
    background:${bg};color:${color};
    font-weight:bold;font-size:0.95em;vertical-align:middle;margin:0 2px;">
    ${val !== undefined && val !== null && val !== "" ? val : "?"}
  </span>`;
}

// ============================================================
// FORMAT INPUT ANSWERS DISPLAY (inline question + colored boxes)
// ============================================================

function formatInputAnswersDisplay(answers, question, correctAnswers) {
  if (!answers || !Array.isArray(answers)) {
    return "<span style='color:red'>Not Answered</span>";
  }

  var perSlotCorrect = buildPerSlotCorrect(answers, correctAnswers, question);
  var idxRef = { i: 0 };

  function slotCorrect(idx) {
    if (correctAnswers === null || correctAnswers === undefined) return null;
    if (correctAnswers === false) return false;
    if (correctAnswers === true) return true;
    return perSlotCorrect[idx];
  }

  // Short question (1-2 inputs): just show answer boxes
  if (question.input && question.input.length <= 2) {
    var shortHTML = "";
    for (var si = 0; si < answers.length; si++) {
      shortHTML += renderAnswerSpan(answers[si], slotCorrect(si)) + " ";
    }
    return (
      "<span style='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;width:100%;gap:10px;font-size:1.1em;'>" +
      shortHTML +
      "</span>"
    );
  }

  var outHTML = "";

  if (Array.isArray(question.question)) {
    // Start from first "Step" part if present, else render all
    var startIdx = 0;
    question.question.some(function (p, idx) {
      if (typeof p === "string" && /Step\s*\d+:/i.test(p)) {
        startIdx = idx;
        return true;
      }
      return false;
    });
    var renderParts = question.question.slice(startIdx);

    renderParts.forEach(function (part) {
      if (typeof part === "string") {
        // Split on ______ placeholders
        var pieces = part.split("______");
        pieces.forEach(function (piece, pi) {
          if (piece) {
            // Clean <br> to space
            outHTML +=
              "<span style='white-space:pre-wrap;'>" +
              piece.replace(/<br\s*\/?>/gi, " ") +
              "</span>";
          }
          if (pi < pieces.length - 1) {
            outHTML += renderAnswerSpan(
              answers[idxRef.i],
              slotCorrect(idxRef.i),
            );
            idxRef.i++;
          }
        });
      } else if (part.root) {
        if (part.root.value === "______") {
          // Root with blank — show answer inside radical
          var rootColor = "#1a2a4a";
          var indexHTML =
            part.root.index && part.root.index !== 2
              ? `<span style="font-size:0.8em;font-weight:bold;color:${rootColor};position:relative;top:-12px;margin-right:-2px;">${part.root.index}</span>`
              : "";
          outHTML += `<span style="display:inline-flex;align-items:flex-end;vertical-align:middle;margin:0 4px;">
            <span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 3px;position:relative;">
              ${indexHTML}
              <span style="font-size:1.6em;font-family:serif;line-height:1;color:${rootColor};margin-right:-2px;position:relative;top:4px;">√</span>
              <span style="border-top:2.5px solid ${rootColor};display:inline-flex;align-items:center;padding:9px 6px 2px 4px;white-space:nowrap;margin-top:4px;">
                ${renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i))}
              </span>
            </span>
          </span>`;
          idxRef.i++;
        } else {
          outHTML += renderRoot(part.root);
        }
      } else if (part.fraction) {
        // Fraction with possible blank numerator/denominator
        var { numerator, denominator } = part.fraction;
        var numHTML =
          numerator === "______"
            ? renderAnswerSpan(answers[idxRef.i++], slotCorrect(idxRef.i - 1))
            : `<span>${numerator}</span>`;
        var denHTML =
          denominator === "______"
            ? renderAnswerSpan(answers[idxRef.i++], slotCorrect(idxRef.i - 1))
            : `<span>${denominator}</span>`;
        outHTML += `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 3px;">
          <span style="border-bottom:1.5px solid currentColor;padding:0 3px;">${numHTML}</span>
          <span style="padding:0 3px;">${denHTML}</span>
        </span>`;
      }
    });
  } else if (typeof question.question === "string") {
    question.question.split("<br>").forEach(function (brPart) {
      brPart.split("______").forEach(function (p, idx, arr) {
        if (p) outHTML += "<span>" + p + "</span>";
        if (idx < arr.length - 1) {
          outHTML += renderAnswerSpan(answers[idxRef.i], slotCorrect(idxRef.i));
          idxRef.i++;
        }
      });
      outHTML += " ";
    });
  }

  return (
    "<span style='display:flex;justify-content:center;align-items:center;flex-wrap:wrap;width:100%;gap:2px;font-size:0.95em;line-height:1.8;'>" +
    outHTML +
    "</span>"
  );
}

// ============================================================
// DISPLAY RESULTS — with unordered fraction + unorderedIndices scoring
// ============================================================
function buildLabelBoxHTML(answersArr, question, colorFn) {
  var qText = typeof question.question === "string" ? question.question : "";
  var lines = qText.split("<br>");
  var ansIdx = 0;
  var html = "";
  lines.forEach(function(line) {
    if (line.indexOf("______") !== -1) {
      var label = line.replace("______", "").replace(/[=\s]+$/, "").trim();
      var val = answersArr[ansIdx] || "";
      var color = colorFn(ansIdx, val);
      html += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <span style="font-size:0.9em;color:#333;">${label}</span>
        <span style="display:inline-flex;align-items:center;justify-content:center;
          min-width:50px;height:30px;padding:0 8px;
          border:2px solid ${color};border-radius:6px;
          background:${color}22;color:${color};font-weight:bold;font-size:1em;">
          ${val || "?"}
        </span>
      </div>`;
      ansIdx++;
    }
  });
  return html || `<span style="color:#28a745;font-weight:bold;">${answersArr.join(" , ")}</span>`;
}
function displayResults() {
  // Calculate the score based on saved answers
  score = Ansgiven.reduce((total, answer, index) => {
    const q = questions[index];

    if (q.options) {
      return answer === q.answer ? total + 1 : total;
    } else if (q.displayType === "table") {
      if (!answer || !Array.isArray(answer)) return total;
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (correct, idx) => norm(answer[idx] || "") === norm(correct),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "addition") {
      if (!answer || !Array.isArray(answer)) return total;
      const allCorrect = q.answer.every(
        (correct, idx) =>
          (answer[idx] || "").trim().toLowerCase() ===
          correct.trim().toLowerCase(),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "lcm-division") {
      if (!answer || !Array.isArray(answer)) return total;
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (correct, idx) => norm(answer[idx] || "") === norm(correct),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "long-division") {
      if (!answer || !answer.values) return total;
      const flat = answer.values.map((v) =>
        typeof v === "object" ? v.value || "" : v,
      );
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (correct, idx) => norm(flat[idx] || "") === norm(correct),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.type === "tree") {
      if (!answer || answer.type !== "tree") return total;
      const norm = (v) => String(v).toLowerCase().trim();
      const treeCorrect = answer.inputs
        ? answer.inputs.every(
            (inp, idx) => norm(inp.value) === norm(inp.answer),
          )
        : false;
      const hcfCorrect = q.hcf
        ? norm(answer.hcf || "") === norm(q.hcf.answer)
        : true;
      return treeCorrect && hcfCorrect ? total + 1 : total;
    } else if (q.longDivisionSq) {
      if (!answer || !Array.isArray(answer)) return total;
      const norm = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
      const allCorrect = q.answer.every(
        (ca, idx) => norm(answer[idx] || "") === norm(ca),
      );
      return allCorrect ? total + 1 : total;
    } else if (q.input && Array.isArray(q.input)) {
      // ── Input questions: unorderedFractions, unorderedIndices, or normal ──
      if (!answer || !Array.isArray(answer) || !Array.isArray(q.answer))
        return total;

      let isCorrect = false;

      if (q.unorderedFractions) {
        const studentSet = buildRationalSet(answer, q);
        const correctSet = buildRationalSet(q.answer, q);
        isCorrect = JSON.stringify(studentSet) === JSON.stringify(correctSet);
      } else if (q.stepValidation) {
        // Step-based flexible checking (prime factorization groups etc.)
        const perSlot = buildPerSlotCorrect(answer, q.answer, q);
        isCorrect = perSlot.every((v) => v === true);
      } else if (q.unorderedIndices && q.unorderedIndices.length > 0) {
        const orderedOk = q.answer.every((ca, idx) => {
          if (q.unorderedIndices.includes(idx)) return true;
          return (
            (answer[idx] || "").toLowerCase().trim() === ca.toLowerCase().trim()
          );
        });
        const givenU = q.unorderedIndices
          .map((idx) => (answer[idx] || "").toLowerCase().trim())
          .sort();
        const correctU = q.unorderedIndices
          .map((idx) => (q.answer[idx] || "").toLowerCase().trim())
          .sort();
        isCorrect =
          orderedOk && JSON.stringify(givenU) === JSON.stringify(correctU);
      } else {
        isCorrect = q.answer.every(
          (correctAnswer, idx) =>
            (answer[idx] || "").toLowerCase().trim() ===
            correctAnswer.toLowerCase().trim(),
        );
      }

      return isCorrect ? total + 1 : total;
    } else {
      const normalizedAnswer = Array.isArray(answer)
        ? answer.map((a) => String(a).replace(/,/g, "").toLowerCase())
        : answer;
      const normalizedCorrect = Array.isArray(q.answer)
        ? q.answer.map((a) => String(a).replace(/,/g, "").toLowerCase())
        : q.answer;
      return JSON.stringify(normalizedAnswer) ===
        JSON.stringify(normalizedCorrect)
        ? total + 1
        : total;
    }
  }, 0);

  console.log("score", score);

  saveToLocalStorage(topicName + "_score", score);
  saveToLocalStorage(topicName + "_completed", "true");

  const questionBackground = document.getElementById("question_background");
  const question = document.getElementById("question");
  const nextbtn = document.getElementById("nextbtn");
  const result = document.getElementById("result");
  const options = document.getElementById("options");
  const head = document.getElementById("head");

  if (questionBackground) questionBackground.style.display = "none";
  if (question) question.style.display = "none";
  if (nextbtn) nextbtn.style.display = "none";
  if (result) result.style.display = "none";
  if (options) options.style.display = "none";
  if (head) head.innerHTML = "Check Your Answers";

  const element = document.querySelector(".question-content");
  if (element) element.style.display = "flex";
  const element1 = document.querySelector(".question-image-area");
  if (element1) element1.style.display = "block";

  var percentage = Math.round((score / questions.length) * 100);
  var progressBarColor = "";
  var feedbackMessage = "";

  if (percentage <= 40) {
    progressBarColor = "#F28D8D";
    feedbackMessage = "You may need more practice.";
  } else if (percentage > 40 && percentage <= 70) {
    progressBarColor = "#6C8EBF";
    feedbackMessage = "Well done!";
  } else if (percentage > 70) {
    progressBarColor = "#B5E7A0";
    feedbackMessage = "Excellent job!";
  }

  var mainDiv = document.getElementsByClassName("maindiv")[0];
  if (mainDiv) mainDiv.style.display = "flex";

  const picdiv = document.getElementById("picdiv");
  if (picdiv) {
    picdiv.classList.remove("col-md-12", "col-lg-12", "col-sm-12", "col-xs-12");
    picdiv.classList.add("col-md-7", "col-lg-7", "col-sm-7", "col-xs-7");
    picdiv.style.backgroundColor = "#B7A0D0";
    picdiv.style.fontSize = "1.8rem";
    picdiv.style.textAlign = "center";
    picdiv.style.color = "#333";
    picdiv.style.display = "block";
  }

  var Dis =
    "<br><br><br><br><br>Thank you for participating.<br><br>Score: " +
    score +
    "/" +
    questions.length +
    "<br><br>";
  var home =
    "<a href='index.html'><b class='btn btn-success next-btn-progress'>Next</b></a><br>";
  var content =
    Dis +
    feedbackMessage +
    "<br><div class='progress'> <div class='progress-bar' role='progressbar' aria-valuenow='" +
    percentage +
    "' aria-valuemin='0' aria-valuemax='100' style='width:" +
    percentage +
    "%;background-color:" +
    progressBarColor +
    ";'> </div></div>" +
    home;

  saveToLocalStorage(topicName + "_results_content", content);
  if (picdiv) picdiv.innerHTML = content;

  var questionContent = "";
  const questiondiv = document.getElementById("questiondiv");
  if (questiondiv) {
    questiondiv.classList.remove("input");
    questiondiv.style.textAlign = "left";
    questiondiv.style.color = "black";
    questiondiv.style.fontSize = "18px";
    questiondiv.innerHTML = "";
  }

  // Build detailed question review
  for (var j = 0; j < questions.length; j++) {
    var ques = questions[j].question;
    var questionText = "";

    if (Array.isArray(ques)) {
      // Show only parts BEFORE the first blank/input slot
      var reachedBlank = false;
      questionText = ques
        .map((part) => {
          if (reachedBlank) return "";
          if (typeof part === "string") {
            var blankIdx = part.search(
              /(<sup>______<\/sup>|<drop>______<\/drop>|______)/,
            );
            if (blankIdx !== -1) {
              reachedBlank = true;
              return part
                .substring(0, blankIdx)
                .replace(/<br\s*\/?>\s*$/, "")
                .trimEnd();
            }
            return part;
          } else if (part.fraction) {
            const { whole, numerator, denominator } = part.fraction;
            if (
              numerator === "______" ||
              denominator === "______" ||
              whole === "______"
            ) {
              reachedBlank = true;
              return "";
            }
            return formatFractionForDisplay(part);
          } else if (part.root) {
            if (part.root.value === "______") {
              reachedBlank = true;
              return "";
            }
            return renderRoot(part.root);
          }
          return "";
        })
        .join("")
        .replace(/<br\s*\/?>\s*$/, "")
        .replace(/[=:\s]+$/, "")
        .trim();
    } else {
      // String question — show only text before first blank
      var firstBlank = (ques || "").search(
        /(<sup>______<\/sup>|<drop>______<\/drop>|______)/,
      );
      if (firstBlank !== -1) {
        questionText = (ques || "")
          .substring(0, firstBlank)
          .replace(/<br[^>]*>/g, " ")
          .replace(/[=:\s]+$/, "")
          .trim();
      } else {
        questionText = ques || "";
      }
    }

    var correctAnswer = "";
    if (questions[j].options) {
      var correctOption = questions[j].options[questions[j].answer];
      if (correctOption) {
        if (correctOption.image) {
          correctAnswer = `<img src="${correctOption.image}" alt="Correct Answer" style="max-width: 150px; max-height: 100px; border-radius: 5px; border: 2px solid #28a745;">`;
        } else if (correctOption.fraction) {
          correctAnswer = formatFractionForDisplay(correctOption);
        } else if (correctOption.textParts) {
          correctAnswer = formatTextPartsForDisplay(correctOption.textParts);
        } else {
          correctAnswer = correctOption.text || correctOption;
        }
      }
    } else if (questions[j].longDivisionSq) {
      correctAnswer = questions[j].answer ? questions[j].answer.join(", ") : "";
    } else if (questions[j].input && Array.isArray(questions[j].input)) {
      correctAnswer = formatInputAnswersDisplay(questions[j].answer || [], questions[j], true);
    } else {
      correctAnswer = Array.isArray(questions[j].answer)
        ? questions[j].answer.join(", ")
        : questions[j].answer;
    }

    var userAnswer = "";
    var isCorrect = false;

    if (Ansgiven[j] !== null && Ansgiven[j] !== undefined) {
      if (questions[j].options) {
        var selectedOption = questions[j].options[Ansgiven[j]];
        if (selectedOption) {
          if (selectedOption.image) {
            var borderColor =
              Ansgiven[j] === questions[j].answer ? "#28a745" : "#dc3545";
            userAnswer = `<img src="${selectedOption.image}" alt="Your Answer" style="max-width: 150px; max-height: 100px; border-radius: 5px; border: 2px solid ${borderColor};">`;
          } else if (selectedOption.fraction) {
            userAnswer = formatFractionForDisplay(selectedOption);
          } else if (selectedOption.textParts) {
            userAnswer = formatTextPartsForDisplay(selectedOption.textParts);
          } else {
            userAnswer = selectedOption.text || selectedOption;
          }
        }
        isCorrect = Ansgiven[j] === questions[j].answer;
      } else if (questions[j].longDivisionSq) {
        var ldAnswers =
          Ansgiven[j] && Array.isArray(Ansgiven[j]) ? Ansgiven[j] : [];
        userAnswer = ldAnswers.join(", ") || "Not answered";
        var normLD = (v) => String(v).replace(/,/g, "").toLowerCase().trim();
        isCorrect =
          Array.isArray(questions[j].answer) &&
          questions[j].answer.every(
            (ca, idx) => normLD(ldAnswers[idx] || "") === normLD(ca),
          );
      } else if (questions[j].input && Array.isArray(questions[j].input)) {
        // Use formatInputAnswersDisplay for inline question + colored boxes
        var correctAnswersArr = questions[j].answer || [];
        var studentAnswersArr =
          Ansgiven[j] && Array.isArray(Ansgiven[j]) ? Ansgiven[j] : [];
       userAnswer = formatInputAnswersDisplay(
          studentAnswersArr,
          questions[j],
          correctAnswersArr,
        );
        correctAnswer = formatInputAnswersDisplay(
          correctAnswersArr,
          questions[j],
          true,
        );
        // Determine correctness
        const q = questions[j];
        const answer = Ansgiven[j];
        if (!answer || !Array.isArray(answer) || !Array.isArray(q.answer)) {
          isCorrect = false;
        } else if (q.unorderedFractions) {
          isCorrect =
            JSON.stringify(buildRationalSet(answer, q)) ===
            JSON.stringify(buildRationalSet(q.answer, q));
        } else if (q.stepValidation) {
          const perSlot = buildPerSlotCorrect(answer, q.answer, q);
          isCorrect = perSlot.every((v) => v === true);
        } else if (q.unorderedIndices && q.unorderedIndices.length > 0) {
          const orderedOk = q.answer.every((ca, idx) => {
            if (q.unorderedIndices.includes(idx)) return true;
            return (
              (answer[idx] || "").toLowerCase().trim() ===
              ca.toLowerCase().trim()
            );
          });
          const givenU = q.unorderedIndices
            .map((idx) => (answer[idx] || "").toLowerCase().trim())
            .sort();
          const correctU = q.unorderedIndices
            .map((idx) => (q.answer[idx] || "").toLowerCase().trim())
            .sort();
          isCorrect =
            orderedOk && JSON.stringify(givenU) === JSON.stringify(correctU);
        } else {
          isCorrect =
            Array.isArray(answer) &&
            q.answer.every(
              (ca, idx) =>
                (answer[idx] || "").toLowerCase().trim() ===
                ca.toLowerCase().trim(),
            );
        }
      } else {
        userAnswer = Array.isArray(Ansgiven[j])
          ? Ansgiven[j].join(", ")
          : Ansgiven[j];
        isCorrect =
          JSON.stringify(Ansgiven[j]) === JSON.stringify(questions[j].answer);
      }
   } else {
      userAnswer = "<span style='color:#dc3545'>Not answered</span>";
      if (questions[j].input && Array.isArray(questions[j].input)) {
        correctAnswer = formatInputAnswersDisplay(
          questions[j].answer || [],
          questions[j],
          true
        );
      }
    }

    var answerColor = isCorrect ? "#28a745" : "#dc3545";

    // ── TABLE question review ──
    if (questions[j].longDivisionSq) {
      // ── LONG DIVISION SQUARE ROOT review — full grid layout ──
      var ldStudentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentLdGrid = buildLongDivisionSqReviewHTML(
        questions[j],
        ldStudentAnswers,
        "student",
      );
      var correctLdGrid = buildLongDivisionSqReviewHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          <div style="display:flex;flex-direction:row;flex-wrap:nowrap;gap:10px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="flex:1;min-width:0;text-align:center;">
              <div style="font-weight:bold;margin-bottom:4px;color:#555;font-size:12px;">Correct Answer</div>
              ${correctLdGrid}
            </div>
            <div style="flex:1;min-width:0;text-align:center;">
              <div style="font-weight:bold;margin-bottom:4px;color:#555;font-size:12px;">Your Answer</div>
              ${studentLdGrid}
            </div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;
    } else if (questions[j].displayType === "table") {
      var studentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentTable = buildTableHTML(
        questions[j],
        studentAnswers,
        "student",
      );
      var correctTable = buildTableHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;min-width:0;">
              <div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>
              <div style="font-size:0.82em;">${correctTable}</div>
            </div>
            <div style="text-align:center;flex:1;min-width:0;">
              <div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>
              <div style="font-size:0.82em;">${studentTable}</div>
            </div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── ADDITION question review ──
    } else if (questions[j].type === "addition") {
      var studentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentGrid = buildAdditionGridHTML(
        questions[j],
        studentAnswers,
        "student",
      );
      var correctGrid = buildAdditionGridHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:nowrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctGrid}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentGrid}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── LCM-DIVISION question review ──
    } else if (questions[j].type === "lcm-division") {
      var studentAnswers =
        Ansgiven[j] && Array.isArray(Ansgiven[j])
          ? Ansgiven[j]
          : new Array(questions[j].answer.length).fill("");

      var studentLCM = buildLCMReviewHTML(
        questions[j],
        studentAnswers,
        "student",
      );
      var correctLCM = buildLCMReviewHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctLCM}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentLCM}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── LONG-DIVISION question review ──
    } else if (questions[j].type === "long-division") {
      var savedLD = Ansgiven[j];
      var studentValuesLD = [];
      if (savedLD && savedLD.values) {
        studentValuesLD = savedLD.values.map((v) =>
          typeof v === "object" ? v.value || "" : v,
        );
      } else {
        studentValuesLD = new Array(questions[j].answer.length).fill("");
      }

      var studentLD = buildLongDivisionReviewHTML(
        questions[j],
        studentValuesLD,
        "student",
      );
      var correctLD = buildLongDivisionReviewHTML(
        questions[j],
        questions[j].answer,
        "correct",
      );

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;width:100%;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctLD}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentLD}</div>
          </div>
          ${questions[j].explanation ? `<div style="margin-top:10px;font-style:italic;color:#666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;

      // ── TREE question review ──
    } else if (questions[j].type === "tree") {
      var savedAns = Ansgiven[j];
      var studentTree = buildTreeReviewHTML(questions[j], savedAns, "student");
      var correctTree = buildTreeReviewHTML(questions[j], savedAns, "correct");

      questionContent += `
        <div class="question-review" style="padding:15px;margin-bottom:15px;border-bottom:1px solid #eee;">
          <div style="font-weight:bold;margin-bottom:10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin:10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width:300px;max-height:200px;border-radius:5px;"></div>` : ""}
          <div style="display:flex;flex-direction:row;flex-wrap:wrap;gap:20px;align-items:flex-start;margin-top:10px;">
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Correct Answer</div>${correctTree}</div>
            <div style="text-align:center;flex:1;"><div style="font-weight:bold;margin-bottom:6px;color:#555;font-size:13px;">Your Answer</div>${studentTree}</div>
          </div>
        </div>
      `;

      // ── ALL OTHER QUESTIONS ──
    } else {
      questionContent += `
        <div class="question-review" style="padding: 15px; margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 10px;">Question ${j + 1}: ${questionText}</div>
          ${questions[j].image ? `<div style="margin: 10px 0;"><img src="${questions[j].image}" alt="Question Image" style="max-width: 300px; max-height: 200px; border-radius: 5px;"></div>` : ""}
          <div style="margin: 8px 0;">
            <strong>Your Answer:</strong>
            ${userAnswer.includes("<img") ? userAnswer : `<span style="color: ${answerColor};">${userAnswer}</span>`}
          </div>
          <div style="margin: 8px 0;">
            <strong>Correct Answer:</strong>
            ${correctAnswer.includes("<img") || correctAnswer.includes("<span") ? correctAnswer : `<span style="color: #28a745;">${correctAnswer}</span>`}
          </div>
          ${questions[j].explanation ? `<div style="margin: 8px 0; font-style: italic; color: #666;"><strong>Explanation:</strong> ${questions[j].explanation}</div>` : ""}
        </div>
      `;
    }
  }

  saveToLocalStorage(topicName + "_question_content", questionContent);

  // ── Split into two pages for PDF if topic has longDivisionSq + long input questions ──
  var hasLongDivSq = questions.some(function (q) {
    return q.longDivisionSq;
  });
  var hasLongInput = questions.some(function (q) {
    return (
      q.input &&
      Array.isArray(q.input) &&
      q.input.length >= 6 &&
      !q.longDivisionSq
    );
  });

  if (hasLongDivSq && hasLongInput) {
    // Split: longDivisionSq questions go to page 2, rest to page 1
    var page1 = "";
    var page2 = "";
    var reviewDivs = questionContent.match(
      /<div class="question-review"[\s\S]*?<\/div>\s*\n?\s*`?/g,
    );

    // Rebuild by iterating questions in order
    var qIdx = 0;
    var tempContent = questionContent;
    // Simple split: first half of questions on page 1, longDivisionSq questions on page 2
    questions.forEach(function (q, idx) {
      if (q.longDivisionSq) {
        // These go to page 2 — already in questionContent, we'll split by question number
      }
    });

    // Split at the first longDivisionSq question
    var splitQNo = -1;
    for (var qi = 0; qi < questions.length; qi++) {
      if (questions[qi].longDivisionSq) {
        splitQNo = qi;
        break;
      }
    }

    if (splitQNo > 0) {
      // Find the split point in questionContent by looking for "Question N:"
      var splitMarker = "Question " + (splitQNo + 1) + ":";
      var splitIdx = questionContent.indexOf(splitMarker);
      if (splitIdx !== -1) {
        // Find the start of the div containing this question
        var divStart = questionContent.lastIndexOf(
          '<div class="question-review"',
          splitIdx,
        );
        if (divStart !== -1) {
          page1 = questionContent.substring(0, divStart);
          page2 = questionContent.substring(divStart);
          saveToLocalStorage(topicName + "_question_content_p2", page2);
          saveToLocalStorage(topicName + "_question_content", page1);
        }
      }
    }
  } else {
    // Remove any stale page 2
    saveToLocalStorage(topicName + "_question_content_p2", null);
  }

  if (questiondiv) {
    if (picdiv) picdiv.innerHTML = content;
    questiondiv.innerHTML = questionContent + home;
  }

  updateButtonStyles();

  var buttons = document.querySelectorAll(".btnButton");
  buttons.forEach((button) => {
    button.classList.add("disabled-btn");
    button.disabled = true;
  });
}

function checkAnswer() {
  submitSound.play();
  saveCurrentAnswer();

  saveToLocalStorage("currentQuestionIndex", i);

  document.getElementById("subbtn").style.display = "none";
  document.getElementById("nextbtn").style.display = "inline-block";

  updateButtonStyles();
}

function abc(x) {
  saveCurrentAnswer();
  i = x - 1;
  saveToLocalStorage("currentQuestionIndex", i);
  loadQuestion(i);
  var resultEl = document.getElementById("result");
  if (resultEl) resultEl.innerHTML = "";
  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";

  highlightButton(i);
  updateButtonStyles();
}

var isSubmitted = false;

// ── UPDATED: checks live inputs (from File 2) ──
function updateButtonVisibility() {
  var currentQuestion = questions[i];
  var hasAnswer = false;

  if (
    (currentQuestion.input && Array.isArray(currentQuestion.input)) ||
    (currentQuestion.displayType === "table" && currentQuestion.tableStructure)
  ) {
    var inputs = document.querySelectorAll(".answer-input");
    inputs.forEach(function (input) {
      if (input.value.trim() !== "") hasAnswer = true;
    });
  } else {
    var selectedAnswer = document.querySelector('input[name="answer"]:checked');
    hasAnswer = selectedAnswer !== null;
  }

  var submitButton = document.getElementById("subbtn");
  var nextButton = document.getElementById("nextbtn");

  if (hasAnswer) {
    submitButton.style.display = "inline-block";
    nextButton.style.display = "none";
  } else {
    submitButton.style.display = "none";
    nextButton.style.display = "none";
  }
}

function highlightButton(index) {
  var buttonContainer = document.getElementById("buttonContainer");
  var buttons = buttonContainer.getElementsByTagName("button");

  for (var j = 0; j < buttons.length; j++) {
    buttons[j].classList.remove("highlighted-btn");
  }

  if (index >= 0 && index < buttons.length) {
    buttons[index].classList.add("highlighted-btn");
  }
}

// ── UPDATED: adds unanswered-btn yellow class (from File 2) ──
function updateButtonStyles() {
  var buttonContainer = document.getElementById("buttonContainer");
  if (!buttonContainer) return;

  var buttons = buttonContainer.getElementsByTagName("button");

  for (var j = 0; j < buttons.length; j++) {
    buttons[j].classList.remove("answered-btn", "unanswered-btn");
  }

  for (var j = 0; j < buttons.length; j++) {
    var hasValidAnswer = false;
    var answer = Ansgiven[j];

    if (Array.isArray(answer)) {
      hasValidAnswer = answer.some((val) => val && val.trim() !== "");
    } else {
      hasValidAnswer = answer !== null && answer !== undefined;
    }

    if (j === i) {
      // current question — default styling, no class
    } else if (hasValidAnswer) {
      buttons[j].classList.add("answered-btn"); // green
    } else {
      buttons[j].classList.add("unanswered-btn"); // yellow
    }
  }
}

function updateButtonText() {
  var nextButton = document.getElementById("nextbtn");
  if (i === count - 1) {
    nextButton.innerHTML = "FINISH TEST";
    nextButton.onclick = function () {
      newques();
    };
  } else {
    nextButton.innerHTML = "Next";
  }
}

// ============================================================
// LCM DIVISION
// ============================================================

function renderLCMDivision(question, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.classList.add("input-question");

  const container = document.createElement("div");
  container.className = "lcm-container";

  question.numbers.forEach((num) => {
    const cell = document.createElement("div");
    cell.className = "lcm-cell";
    cell.textContent = num;
  });

  let inputIndex = 0;

  question.steps.forEach((step, stepIndex) => {
    const row = document.createElement("div");
    row.className = "lcm-row";

    if (stepIndex === question.steps.length - 1) {
      row.style.borderBottom = "none";
    }

    const divisorCell = document.createElement("div");
    divisorCell.className = "lcm-divisor";

    if (step.divisor === "_") {
      divisorCell.appendChild(createLCMInput(index, inputIndex++));
    } else if (step.divisor !== null) {
      divisorCell.textContent = step.divisor;
    }

    row.appendChild(divisorCell);

    step.values.forEach((val) => {
      const cell = document.createElement("div");
      cell.className = "lcm-cell";

      if (val === "_") {
        cell.appendChild(createLCMInput(index, inputIndex++));
      } else {
        cell.textContent = val;
      }

      row.appendChild(cell);
    });

    container.appendChild(row);
  });

  if ("lcm" in question) {
    const resultRow = document.createElement("div");
    resultRow.className = "lcm-result";
    const label = question.resultLabel || "HCF";
    resultRow.innerHTML = `<strong>${label} = </strong>`;
    resultRow.appendChild(createLCMInput(index, inputIndex++));
    container.appendChild(resultRow);
  }

  if (Array.isArray(question["Prime factorization"])) {
    const pfWrapper = document.createElement("div");
    pfWrapper.className = "prime-factorization";

    const label = document.createElement("strong");
    label.innerText = "Prime factorization: ";
    pfWrapper.appendChild(label);

    let pfInputIndex = container.querySelectorAll(".lcm-input").length;

    question["Prime factorization"].forEach((item, idx) => {
      if (item === "_") {
        pfWrapper.appendChild(createLCMInput(index, pfInputIndex++));
      } else {
        const span = document.createElement("span");
        span.innerText = item;
        pfWrapper.appendChild(span);
      }

      if (idx > 0 && idx < question["Prime factorization"].length - 1) {
        pfWrapper.appendChild(document.createTextNode(" × "));
      }
    });

    container.appendChild(document.createElement("hr"));
    container.appendChild(pfWrapper);
  }

  optionsElement.appendChild(container);
  restoreLCMAnswers(index);
}

function createLCMInput(qIndex, ansIndex) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "answer-input lcm-input";
  input.dataset.q = qIndex;
  input.dataset.a = ansIndex;

  input.addEventListener("input", () => {
    handleLCMInputChange(qIndex);
  });

  return input;
}

function handleLCMInputChange(qIndex) {
  const inputs = document.querySelectorAll(".lcm-input");
  const values = [];
  inputs.forEach((inp) => values.push(inp.value.trim()));
  Ansgiven[qIndex] = values;

  saveToLocalStorage("Ansgiven", Ansgiven);

  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function restoreLCMAnswers(index) {
  if (!Ansgiven[index]) return;

  const inputs = document.querySelectorAll(".lcm-input");
  inputs.forEach((inp, i) => {
    if (Ansgiven[index][i] !== undefined) {
      inp.value = Ansgiven[index][i];
    }
  });
}

// ============================================================
// LONG DIVISION
// ============================================================

var treeInputs = [];
var renderedTreeRoot = [];

function renderLongDivision(q, optionsElement, index) {
  optionsElement.innerHTML = "";
  optionsElement.classList.add("input-question");

  const container = document.createElement("div");
  container.className = "long-division-container";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.width = "100%";

  let inputIndex = 0;

  function makeCell(val) {
    if (val === "_") {
      const id = inputIndex++;
      return `<input 
        type="text"
        class="answer-input long-div-input"
        data-q="${index}"
        data-a="${id}"
        style="width:60px;height:38px;font-size:0.8em;text-align:center;
               border:2px solid #667eea;border-radius:4px;font-weight:bold;" />`;
    }
    if (val === undefined || val === null) return "";
    return `<span style="font-size:1em;font-weight:bold;display:inline-flex;
                         align-items:center;justify-content:center;min-width:60px;">${val}</span>`;
  }

  const steps = q.steps;
  const N = steps.length;

  const R = steps.map((s, i) => {
    let divisor = s.divisor;
    let dividend = s.dividend;
    if (i > 0) {
      if (divisor === undefined) divisor = steps[i - 1].remainder;
      if (dividend === undefined) dividend = steps[i - 1].divisor;
    }
    return { ...s, divisor, dividend };
  });

  const totalRows = N * 2 + 2;
  const totalCols = N * 2 + 4;

  const grid = Array.from({ length: totalRows }, () =>
    Array.from({ length: totalCols }, () => ({ content: "", style: "" })),
  );

  for (let i = 0; i < N; i++) {
    const s = R[i];
    const baseRow = i * 2;
    const divCol = i * 2;
    const brkLCol = i * 2 + 1;
    const dvdCol = i * 2 + 2;
    const brkRCol = i * 2 + 3;

    grid[baseRow][dvdCol] = {
      content: makeCell(s.quotient),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:60px;",
    };

    if (i === 0) {
      grid[baseRow + 1][divCol] = {
        content: makeCell(s.divisor),
        style: "text-align:right;padding-right:6px;vertical-align:middle;",
      };
    }
    grid[baseRow + 1][brkLCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">)</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };
    grid[baseRow + 1][dvdCol] = {
      content: makeCell(s.dividend),
      style:
        "text-align:center;border-top:3px solid black;padding:6px 8px;vertical-align:middle;min-width:60px;",
    };
    grid[baseRow + 1][brkRCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">(</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };

    grid[baseRow + 2][brkLCol] = {
      content: `<span style="font-size:1em;font-weight:bold;">−</span>`,
      style: "text-align:right;vertical-align:middle;padding-right:2px;",
    };
    grid[baseRow + 2][dvdCol] = {
      content: makeCell(s.subtract),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:60px;",
    };

    grid[baseRow + 3][dvdCol] = {
      content: makeCell(s.remainder),
      style:
        "text-align:center;padding:6px 8px;vertical-align:middle;min-width:44px;",
    };
  }

  let html = `<div style="width:100%;display:flex;justify-content:center;align-items:center;margin:10px 0;">`;
  html += `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:1.4em;">`;

  for (let r = 0; r < totalRows; r++) {
    const rowHasContent = grid[r].some((c) => c.content !== "");
    if (!rowHasContent) continue;
    html += `<tr>`;
    for (let c = 0; c < totalCols; c++) {
      const cell = grid[r][c];
      html += `<td style="padding:0;${cell.style}">${cell.content}</td>`;
    }
    html += `</tr>`;
  }

  html += `</table></div>`;

  if (q.hcf !== undefined || q.gcf !== undefined) {
    const label = q.gcf !== undefined ? "GCF" : "HCF";
    html += `
      <div style="text-align:center;font-size:1.3em;font-weight:bold;margin-top:20px;">
        ${label} = 
        <input 
          type="text"
          class="answer-input long-div-input hcf-input"
          data-q="${index}"
          data-a="hcf"
          style="width:80px;height:38px;font-size:0.8em;margin-left:8px;text-align:center;" />
      </div>`;
  }

  container.innerHTML = html;
  optionsElement.appendChild(container);

  restoreLongDivisionAnswers(index);

  const inputs = container.querySelectorAll(".long-div-input");
  inputs.forEach((input) => {
    input.addEventListener("input", () => handleLongDivisionInputChange(index));
  });
}

function handleLongDivisionInputChange(qIndex) {
  const inputs = Array.from(document.querySelectorAll(".long-div-input"));

  inputs.sort((a, b) => {
    if (a.dataset.a === "hcf") return 1;
    if (b.dataset.a === "hcf") return -1;
    return parseInt(a.dataset.a, 10) - parseInt(b.dataset.a, 10);
  });

  const values = [];
  inputs.forEach((inp) => {
    if (inp.classList.contains("hcf-input")) {
      values.push({ type: "hcf", value: inp.value.trim() });
    } else {
      values.push(inp.value.trim());
    }
  });

  Ansgiven[qIndex] = {
    type: "long-division",
    values: values,
    image: null,
  };

  saveToLocalStorage("Ansgiven", Ansgiven);
  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function restoreLongDivisionAnswers(index) {
  if (!Ansgiven[index]) return;

  const saved = Ansgiven[index];
  const values = saved.type === "long-division" ? saved.values : saved;
  if (!Array.isArray(values)) return;

  const inputs = Array.from(document.querySelectorAll(".long-div-input"));

  inputs.forEach((inp) => {
    if (inp.classList.contains("hcf-input")) {
      const hcfData = values.find((item) => item && item.type === "hcf");
      if (hcfData) inp.value = hcfData.value;
    } else {
      const logicIndex = parseInt(inp.dataset.a, 10);
      if (!isNaN(logicIndex) && values[logicIndex] !== undefined) {
        const val =
          typeof values[logicIndex] === "object"
            ? values[logicIndex].value
            : values[logicIndex];
        inp.value = val || "";
      }
    }
  });
}

function buildLongDivisionReviewHTML(question, resultValues, mode) {
  let inputIndex = 0;

  function makeCell(val) {
    if (val === "_") {
      const filled = (resultValues[inputIndex] || "").trim();
      const correct = (question.answer[inputIndex] || "").trim();
      const isRight = filled.toLowerCase() === correct.toLowerCase();
      const display = mode === "correct" ? correct : filled || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const color =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      return `<span style="
        display:inline-flex;align-items:center;justify-content:center;
        min-width:44px;height:38px;background:${bg};color:${color};
        border-radius:6px;font-weight:bold;font-size:1em;padding:0 6px;
      ">${display}</span>`;
    }
    if (val === undefined || val === null) return "";
    return `<span style="font-size:1em;font-weight:bold;display:inline-flex;
                         align-items:center;justify-content:center;min-width:44px;">${val}</span>`;
  }

  const steps = question.steps;
  const N = steps.length;
  const totalRows = N * 2 + 2;
  const totalCols = N * 2 + 4;

  const grid = Array.from({ length: totalRows }, () =>
    Array.from({ length: totalCols }, () => ({ content: "", style: "" })),
  );

  for (let i = 0; i < N; i++) {
    const s = steps[i];
    const baseRow = i * 2;
    const divCol = i * 2;
    const brkLCol = i * 2 + 1;
    const dvdCol = i * 2 + 2;
    const brkRCol = i * 2 + 3;

    grid[baseRow][dvdCol] = {
      content: makeCell(s.quotient),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:44px;",
    };

    if (i === 0) {
      grid[baseRow + 1][divCol] = {
        content: makeCell(s.divisor),
        style: "text-align:right;padding-right:6px;vertical-align:middle;",
      };
    }

    grid[baseRow + 1][brkLCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">)</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };

    grid[baseRow + 1][dvdCol] = {
      content: makeCell(s.dividend),
      style:
        "text-align:center;border-top:3px solid black;padding:6px 8px;vertical-align:middle;min-width:44px;",
    };

    grid[baseRow + 1][brkRCol] = {
      content: `<span style="font-size:1.6em;line-height:1;">(</span>`,
      style: "vertical-align:middle;padding:0 2px;",
    };

    grid[baseRow + 2][brkLCol] = {
      content: `<span style="font-size:1em;font-weight:bold;">−</span>`,
      style: "text-align:right;vertical-align:middle;padding-right:2px;",
    };
    grid[baseRow + 2][dvdCol] = {
      content: makeCell(s.subtract),
      style:
        "text-align:center;border-bottom:3px solid black;padding:4px 8px;min-width:44px;",
    };

    const nextStep = steps[i + 1];
    if (nextStep && nextStep.divisor === "_") {
      grid[baseRow + 3][divCol] = {
        content: makeCell(nextStep.divisor),
        style: "text-align:right;padding-right:6px;vertical-align:middle;",
      };
      grid[baseRow + 3][dvdCol] = {
        content: makeCell(s.remainder),
        style:
          "text-align:center;padding:6px 8px;vertical-align:middle;min-width:44px;",
      };
    } else {
      grid[baseRow + 3][dvdCol] = {
        content: makeCell(s.remainder),
        style:
          "text-align:center;padding:6px 8px;vertical-align:middle;min-width:44px;",
      };
    }
  }

  let html = `<div style="display:flex;justify-content:center;align-items:center;margin:10px 0;overflow-x:auto;">`;
  html += `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:1.1em;">`;

  for (let r = 0; r < totalRows; r++) {
    const rowHasContent = grid[r].some((c) => c.content !== "");
    if (!rowHasContent) continue;
    html += `<tr>`;
    for (let c = 0; c < totalCols; c++) {
      const cell = grid[r][c];
      html += `<td style="padding:0;${cell.style}">${cell.content}</td>`;
    }
    html += `</tr>`;
  }

  html += `</table></div>`;

  if (question.hcf !== undefined) {
    const filled = (resultValues[inputIndex] || "").trim();
    const correct = (question.answer[inputIndex] || "").trim();
    const isRight = filled.toLowerCase() === correct.toLowerCase();
    const display = mode === "correct" ? correct : filled || "?";
    const bg = mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
    const color =
      mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";

    html += `
      <div style="text-align:center;font-size:1.2em;font-weight:bold;margin-top:14px;">
        HCF = 
        <span style="display:inline-flex;align-items:center;justify-content:center;
                     min-width:60px;height:38px;background:${bg};color:${color};
                     border-radius:6px;font-weight:bold;padding:0 10px;margin-left:8px;">
          ${display}
        </span>
      </div>`;
  }

  return html;
}

// ============================================================
// TREE QUESTION
// ============================================================

function buildTreeReviewHTML(question, savedAnswer, mode) {
  function collectBlanks(node, result = []) {
    if (node.value === "" || node.value === "_" || node.value == null) {
      result.push({ answer: node.answer });
    }
    if (node.children) node.children.forEach((c) => collectBlanks(c, result));
    return result;
  }

  function buildSVGTree(treeData, answerValues) {
    const levelGap = 80;
    const nodeRadius = 22;
    const nodes = [];
    const links = [];
    let xCounter = 0;
    let ansIdx = 0;

    function layout(node, depth = 0) {
      const isBlank =
        node.value === "" || node.value === "_" || node.value == null;

      let display, bg, borderColor, textColor;

      if (isBlank) {
        const filled = (answerValues[ansIdx] || "").trim();
        const correct = (node.answer || "").trim();
        const isRight = filled.toLowerCase() === correct.toLowerCase();
        display = mode === "correct" ? correct : filled || "?";
        bg = mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        textColor =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
        borderColor =
          mode === "correct" ? "#28a745" : isRight ? "#28a745" : "#dc3545";
        ansIdx++;
      } else {
        display = node.value;
        bg = "#f5f5f5";
        textColor = "#333";
        borderColor = "#333";
      }

      const current = {
        display,
        bg,
        textColor,
        borderColor,
        depth,
        children: [],
        x: 0,
        y: depth * levelGap + nodeRadius + 10,
      };

      nodes.push(current);

      if (!node.children || node.children.length === 0) {
        current.x = xCounter * 70 + 40;
        xCounter++;
      } else {
        const childXs = [];
        node.children.forEach((child) => {
          const childNode = layout(child, depth + 1);
          current.children.push(childNode);
          links.push({ parent: current, child: childNode });
          childXs.push(childNode.x);
        });
        current.x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
      }

      return current;
    }

    layout(treeData);

    const svgWidth = Math.max(...nodes.map((n) => n.x)) + 60;
    const svgHeight = Math.max(...nodes.map((n) => n.y)) + nodeRadius + 20;

    let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" 
                    width="${svgWidth}" height="${svgHeight}"
                    xmlns="http://www.w3.org/2000/svg">`;

    links.forEach((link) => {
      svg += `<line 
        x1="${link.parent.x}" y1="${link.parent.y + nodeRadius}"
        x2="${link.child.x}"  y2="${link.child.y - nodeRadius}"
        stroke="#333" stroke-width="2"/>`;
    });

    nodes.forEach((node) => {
      svg += `
        <circle cx="${node.x}" cy="${node.y}" r="${nodeRadius}"
          fill="${node.bg}" stroke="${node.borderColor}" stroke-width="2"/>
        <text x="${node.x}" y="${node.y + 5}"
          text-anchor="middle" font-size="13" font-weight="bold"
          fill="${node.textColor}">${node.display}</text>
      `;
    });

    svg += `</svg>`;
    return svg;
  }

  const trees = question.trees
    ? question.trees.map((t) => t.tree)
    : [question.tree];

  let allAnswerValues = [];
  if (mode === "correct") {
    allAnswerValues = question.answer || [];
  } else {
    if (savedAnswer && savedAnswer.inputs) {
      allAnswerValues = savedAnswer.inputs.map((i) => i.value || "");
    }
  }

  let html = `<div style="display:flex;flex-wrap:wrap;gap:24px;justify-content:center;">`;

  let answerOffset = 0;
  trees.forEach((treeData) => {
    const blanksInTree = collectBlanks(treeData);
    const treeAnswers = allAnswerValues.slice(
      answerOffset,
      answerOffset + blanksInTree.length,
    );

    html += `
      <div style="
        border:1px solid #ddd;border-radius:10px;
        padding:16px;background:#fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.06);
        display:inline-block;text-align:center;
      ">
        ${buildSVGTree(treeData, treeAnswers)}
      </div>
    `;
    answerOffset += blanksInTree.length;
  });

  html += `</div>`;

  if (question.hcf) {
    const hcfFilled =
      savedAnswer && savedAnswer.hcf ? savedAnswer.hcf.trim() : "";
    const hcfCorrect = (question.hcf.answer || "").trim();
    const hcfRight = hcfFilled.toLowerCase() === hcfCorrect.toLowerCase();
    const display = mode === "correct" ? hcfCorrect : hcfFilled || "?";
    const bg =
      mode === "correct" ? "#d4edda" : hcfRight ? "#d4edda" : "#f8d7da";
    const color =
      mode === "correct" ? "#155724" : hcfRight ? "#155724" : "#721c24";

    const labelText = question.hcf.question2 || "GCF = ___";
    const replaced = labelText.replace(
      "___",
      `
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        min-width:50px;height:34px;background:${bg};color:${color};
        border-radius:6px;font-weight:bold;padding:0 10px;
      ">${display}</span>
    `,
    );

    html += `
      <div style="text-align:center;margin-top:16px;font-size:1.1em;font-weight:bold;">
        ${replaced}
      </div>
    `;
  }

  return html;
}

function renderTreeQuestion(q, optionsElement, index) {
  treeInputs = [];
  renderedTreeRoot = [];

  optionsElement.innerHTML = "";
  optionsElement.classList.add("input-question");
  optionsElement.style.display = "flex";
  optionsElement.style.flexDirection = "column";
  optionsElement.style.alignItems = "center";
  optionsElement.style.justifyContent = "center";
  optionsElement.style.width = "100%";

  const container = document.createElement("div");
  container.className = "tree-question-container";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.width = "100%";
  container.style.textAlign = "center";

  if (q.question) {
    const qText = document.createElement("div");
    qText.style.fontSize = "1.4em";
    qText.style.fontWeight = "bold";
    qText.style.textAlign = "center";
    qText.style.marginBottom = "10px";
    qText.style.width = "100%";
    qText.innerHTML =
      typeof q.question === "string"
        ? q.question
        : q.question.map((p) => (typeof p === "string" ? p : "")).join("");
    container.appendChild(qText);
  }

  let html = `
    <div id="treeSVGWrapper"
       style="display:flex;justify-content:center;align-items:flex-start;
              gap:40px;width:100%;margin-top:20px;">
    </div>
  `;

  if (q.hcf !== undefined) {
    const questionText = q.hcf.question2 || "HCF = ___";
    html += `
      <div class="questionText" style="text-align:center; margin-top:20px; font-size:2.2rem;">
        ${questionText.replace(
          "___",
          `<input 
            type="text"
            class="answer-input tree-hcf-input"
            data-q="${index}"
            style="
              width: 80px;
              height: 36px;
              font-size: 2rem;
              text-align: center;
              border: 2px solid #007bff;
              border-radius: 6px;
              padding: 4px;
              vertical-align: middle;
            "
          />`,
        )}
      </div>
    `;
  }

  container.innerHTML = html;
  optionsElement.appendChild(container);

  if (q.trees) {
    q.trees.forEach((treeObj) => {
      drawTreeSVG(treeObj.tree, index);
    });
  } else if (q.tree) {
    drawTreeSVG(q.tree, index);
  }

  restoreTreeAnswers(index);

  treeInputs.forEach((item) => {
    item.element.addEventListener("input", () => handleTreeInputChange(index));
  });

  const hcfInput = container.querySelector(".tree-hcf-input");
  if (hcfInput) {
    hcfInput.addEventListener("input", () => handleTreeInputChange(index));
  }
}

function drawTreeSVG(treeData, qIndex) {
  const width = 450;
  const levelGap = 90;
  const nodeRadius = 25;
  const nodes = [];
  const links = [];
  let xCounter = 0;

  function layout(node, depth = 0, parent = null) {
    const current = {
      value: node.value,
      answer: node.answer,
      depth,
      parent,
      children: [],
      x: 0,
      y: depth * levelGap + 40,
    };

    nodes.push(current);

    if (!node.children || node.children.length === 0) {
      current.x = xCounter * 80 + 60;
      xCounter++;
    } else {
      const childPositions = [];
      node.children.forEach((child) => {
        const childNode = layout(child, depth + 1, current);
        current.children.push(childNode);
        links.push({ parent: current, child: childNode });
        childPositions.push(childNode.x);
      });
      current.x =
        (Math.min(...childPositions) + Math.max(...childPositions)) / 2;
    }

    return current;
  }

  const root = layout(treeData);
  renderedTreeRoot.push(root);

  const height = Math.max(...nodes.map((n) => n.y)) + 80;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  links.forEach((link) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", link.parent.x);
    line.setAttribute("y1", link.parent.y + nodeRadius);
    line.setAttribute("x2", link.child.x);
    line.setAttribute("y2", link.child.y - nodeRadius);
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
  });

  nodes.forEach((node) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", nodeRadius);
    circle.setAttribute("fill", "white");
    circle.setAttribute("stroke", "black");
    circle.setAttribute("stroke-width", "2");
    node.circle = circle;
    group.appendChild(circle);

    if (node.value === "" || node.value === "_" || node.value == null) {
      const foreign = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "foreignObject",
      );
      foreign.setAttribute("x", node.x - 20);
      foreign.setAttribute("y", node.y - 15);
      foreign.setAttribute("width", 40);
      foreign.setAttribute("height", 30);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "answer-input tree-input";
      input.style.width = "38px";
      input.style.textAlign = "center";
      input.style.border = "2px solid transparent";
      input.style.outline = "none";
      input.style.fontWeight = "bold";
      input.dataset.q = qIndex;

      treeInputs.push({
        element: input,
        answer: node.answer,
        node: node,
      });

      foreign.appendChild(input);
      group.appendChild(foreign);
    } else {
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", node.x);
      text.setAttribute("y", node.y + 5);
      text.setAttribute("text-anchor", "middle");
      text.textContent = node.value;
      group.appendChild(text);
    }

    svg.appendChild(group);
  });

  document.getElementById("treeSVGWrapper").appendChild(svg);
}

function handleTreeInputChange(qIndex) {
  const values = {
    type: "tree",
    inputs: [],
    hcf: null,
    image: null,
  };

  treeInputs.forEach((item) => {
    values.inputs.push({
      value: item.element.value.trim(),
      answer: item.answer,
    });
  });

  const hcfInput = document.querySelector(".tree-hcf-input");
  if (hcfInput) values.hcf = hcfInput.value.trim();

  Ansgiven[qIndex] = values;
  saveToLocalStorage("Ansgiven", Ansgiven);

  document.getElementById("subbtn").style.display = "inline-block";
  document.getElementById("nextbtn").style.display = "none";
}

function restoreTreeAnswers(index) {
  if (!Ansgiven[index] || Ansgiven[index].type !== "tree") return;

  const saved = Ansgiven[index];

  if (saved.inputs) {
    treeInputs.forEach((item, i) => {
      if (saved.inputs[i]) {
        item.element.value = saved.inputs[i].value || "";
      }
    });
  }

  const hcfInput = document.querySelector(".tree-hcf-input");
  if (hcfInput && saved.hcf) {
    hcfInput.value = saved.hcf;
  }
}

// ============================================================
// LCM REVIEW HTML
// ============================================================

function buildLCMReviewHTML(question, resultValues, mode) {
  let inputIndex = 0;

  function makeCell(val) {
    if (val === "_") {
      const filled = (resultValues[inputIndex] || "").trim();
      const correct = (question.answer[inputIndex] || "").trim();
      const isRight = filled.toLowerCase() === correct.toLowerCase();
      const display = mode === "correct" ? correct : filled || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const color =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      return `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;background:${bg};color:${color};border-bottom:2px solid #999;">${display}</td>`;
    }
    if (val === null || val === undefined) {
      return `<td style="border-bottom:2px solid #999;"></td>`;
    }
    return `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;border-bottom:2px solid #999;">${val}</td>`;
  }

  let html = `<table style="border-collapse:collapse;margin:8px auto;">`;

  question.steps.forEach((step, stepIndex) => {
    const isLast = stepIndex === question.steps.length - 1;
    html += `<tr>`;

    if (step.divisor === "_") {
      const filled = (resultValues[inputIndex] || "").trim();
      const correct = (question.answer[inputIndex] || "").trim();
      const isRight = filled.toLowerCase() === correct.toLowerCase();
      const display = mode === "correct" ? correct : filled || "?";
      const bg =
        mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
      const color =
        mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
      inputIndex++;
      html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                border-right:3px solid #333;
                ${!isLast ? "border-bottom:2px solid #999;" : ""}
                background:${bg};color:${color};">${display}</td>`;
    } else if (step.divisor === null || step.divisor === undefined) {
      html += `<td style="border-right:3px solid #333;${!isLast ? "border-bottom:2px solid #999;" : ""}"></td>`;
    } else {
      html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                border-right:3px solid #333;
                ${!isLast ? "border-bottom:2px solid #999;" : ""}">${step.divisor}</td>`;
    }

    step.values.forEach((val) => {
      if (val === "_") {
        const filled = (resultValues[inputIndex] || "").trim();
        const correct = (question.answer[inputIndex] || "").trim();
        const isRight = filled.toLowerCase() === correct.toLowerCase();
        const display = mode === "correct" ? correct : filled || "?";
        const bg =
          mode === "correct" ? "#d4edda" : isRight ? "#d4edda" : "#f8d7da";
        const color =
          mode === "correct" ? "#155724" : isRight ? "#155724" : "#721c24";
        inputIndex++;
        html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                  ${!isLast ? "border-bottom:2px solid #999;" : ""}
                  background:${bg};color:${color};">${display}</td>`;
      } else {
        html += `<td style="text-align:center;padding:10px 16px;font-size:1.1rem;font-weight:bold;
                  ${!isLast ? "border-bottom:2px solid #999;" : ""}">${val ?? ""}</td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</table>`;

  if ("lcm" in question) {
    const hcfFilled = (resultValues[inputIndex] || "").trim();
    const hcfCorrect = (question.answer[inputIndex] || "").trim();
    const hcfRight = hcfFilled.toLowerCase() === hcfCorrect.toLowerCase();
    const display = mode === "correct" ? hcfCorrect : hcfFilled || "?";
    const bg =
      mode === "correct" ? "#d4edda" : hcfRight ? "#d4edda" : "#f8d7da";
    const color =
      mode === "correct" ? "#155724" : hcfRight ? "#155724" : "#721c24";
    const label = question.resultLabel || "HCF";

    html += `
      <div style="margin-top:10px;font-size:1.1rem;font-weight:bold;display:flex;align-items:center;gap:8px;">
        ${label} = 
        <span style="background:${bg};color:${color};padding:4px 14px;border-radius:6px;font-size:1.1rem;">
          ${display}
        </span>
      </div>
    `;
  }

  return html;
}
