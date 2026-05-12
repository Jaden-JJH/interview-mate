// 생성된 문서(이력서·경력기술서·자소서)를 Word/PDF로 내보내는 클라이언트 유틸
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

function parseContentToLines(content: string) {
  return content.split("\n");
}

function lineToDocxParagraph(line: string): Paragraph {
  const trimmed = line.trim();

  if (trimmed.startsWith("# ")) {
    return new Paragraph({
      children: [
        new TextRun({
          text: trimmed.replace(/^#\s+/, ""),
          bold: true,
          size: 32,
          font: "맑은 고딕",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    });
  }

  if (trimmed.startsWith("## ")) {
    return new Paragraph({
      children: [
        new TextRun({
          text: trimmed.replace(/^##\s+/, "").replace(/^[■●▶]\s*/, ""),
          bold: true,
          size: 26,
          font: "맑은 고딕",
        }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
    });
  }

  if (trimmed.startsWith("### ")) {
    return new Paragraph({
      children: [
        new TextRun({
          text: trimmed.replace(/^###\s+/, ""),
          bold: true,
          size: 22,
          font: "맑은 고딕",
        }),
      ],
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 160, after: 80 },
    });
  }

  if (trimmed === "---" || trimmed === "___") {
    return new Paragraph({
      spacing: { before: 120, after: 120 },
    });
  }

  if (trimmed.startsWith("- ") || trimmed.startsWith("· ") || trimmed.startsWith("• ")) {
    const text = trimmed.replace(/^[-·•]\s+/, "");
    const runs = parseBoldRuns(text);
    return new Paragraph({
      children: runs,
      bullet: { level: 0 },
      spacing: { after: 40 },
    });
  }

  if (/^\|.*\|$/.test(trimmed)) {
    const cells = trimmed
      .split("|")
      .filter(Boolean)
      .map((c) => c.trim());
    if (cells.every((c) => /^[-:]+$/.test(c))) {
      return new Paragraph({ spacing: { after: 0 } });
    }
    const runs: TextRun[] = [];
    cells.forEach((cell, i) => {
      if (i > 0) runs.push(new TextRun({ text: "  |  ", font: "맑은 고딕", size: 20 }));
      const isBold = cell.startsWith("**") && cell.endsWith("**");
      runs.push(
        new TextRun({
          text: cell.replace(/\*\*/g, ""),
          bold: isBold,
          font: "맑은 고딕",
          size: 20,
        })
      );
    });
    return new Paragraph({ children: runs, spacing: { after: 40 } });
  }

  if (trimmed === "") {
    return new Paragraph({ spacing: { after: 80 } });
  }

  const runs = parseBoldRuns(trimmed);
  return new Paragraph({
    children: runs,
    spacing: { after: 60 },
  });
}

function parseBoldRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(Boolean)
    .map((part) => {
      const isBold = part.startsWith("**") && part.endsWith("**");
      return new TextRun({
        text: isBold ? part.slice(2, -2) : part,
        bold: isBold,
        font: "맑은 고딕",
        size: 20,
      });
    });
}

export async function exportAsWord(content: string, filename: string) {
  const lines = parseContentToLines(content);
  const paragraphs = lines.map(lineToDocxParagraph);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

export function exportAsPDF(content: string, title: string) {
  const htmlContent = contentToHtml(content);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { margin: 20mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "맑은 고딕", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      font-size: 11pt;
      line-height: 1.7;
      color: #1a1a1a;
      padding: 0;
    }
    h1 { font-size: 18pt; font-weight: 800; margin-bottom: 12px; }
    h2 {
      font-size: 13pt; font-weight: 700; margin-top: 18px; margin-bottom: 8px;
      padding-bottom: 4px; border-bottom: 1px solid #ddd;
    }
    h3 { font-size: 11pt; font-weight: 700; margin-top: 12px; margin-bottom: 4px; }
    p { margin-bottom: 4px; }
    ul { margin-left: 18px; margin-bottom: 6px; }
    li { margin-bottom: 2px; }
    hr { border: none; border-top: 1px solid #eee; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    td, th { border: 1px solid #ddd; padding: 6px 10px; font-size: 10pt; }
    th { background: #f5f5f5; font-weight: 700; }
    .bold { font-weight: 700; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
${htmlContent}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`);
  printWindow.document.close();
}

function contentToHtml(content: string): string {
  const lines = content.split("\n");
  const htmlParts: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    htmlParts.push("<table>");
    tableRows.forEach((cells, i) => {
      const tag = i === 0 ? "th" : "td";
      htmlParts.push(
        "<tr>" + cells.map((c) => `<${tag}>${escBold(esc(c))}</${tag}>`).join("") + "</tr>"
      );
    });
    htmlParts.push("</table>");
    tableRows = [];
  }

  for (const line of lines) {
    const t = line.trim();

    if (/^\|.*\|$/.test(t)) {
      const cells = t.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      if (!inTable) inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      inTable = false;
      flushTable();
    }

    if (t.startsWith("# ")) {
      htmlParts.push(`<h1>${esc(t.slice(2))}</h1>`);
    } else if (t.startsWith("## ")) {
      htmlParts.push(`<h2>${esc(t.slice(3)).replace(/^[■●▶]\s*/, "")}</h2>`);
    } else if (t.startsWith("### ")) {
      htmlParts.push(`<h3>${esc(t.slice(4))}</h3>`);
    } else if (t === "---" || t === "___") {
      htmlParts.push("<hr />");
    } else if (t.startsWith("- ") || t.startsWith("· ") || t.startsWith("• ")) {
      htmlParts.push(`<ul><li>${escBold(esc(t.replace(/^[-·•]\s+/, "")))}</li></ul>`);
    } else if (t === "") {
      // skip empty
    } else {
      htmlParts.push(`<p>${escBold(esc(t))}</p>`);
    }
  }
  if (inTable) flushTable();
  return htmlParts.join("\n");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escBold(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '<span class="bold">$1</span>');
}
