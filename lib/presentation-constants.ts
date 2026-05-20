export const PRES_LAYOUT = {
  width: 10, // inches
  height: 5.625, // inches
  ratio: 16 / 9,
};

export const SLIDE_THEME = {
  titleSlide: {
    title: {
      x: 1,
      y: 2,
      w: 8,
      fontSize: 44,
      color: "#FFFFFF",
      align: "center",
      bold: true,
    },
    subtitle: {
      x: 1,
      y: 3.5,
      w: 8,
      fontSize: 18,
      color: "#FFFFFF",
      align: "center",
    }
  },
  questionSlide: {
    margins: {
      x: 0.4,
      y: 0.3,
      w: 9.2, // 10 - 2*0.4
      h: 5.025, // 5.625 - 0.3*2
    },
    layouts: {
      standard: {
        body: { x: 0.4, y: 0.2, w: 9.2, h: 4.0 },
        options: { x: 0.4, y: 4.3, w: 9.2, h: 1.1 }
      },
      solving: {
        body: { x: 5.2, y: 0.2, w: 4.4, h: 4.0 },
        options: { x: 5.2, y: 4.3, w: 4.4, h: 1.1 }
      }
    },
    header: {
      qNumSize: 22,
      examSize: 9,
      spacing: 0.1,
    },
    body: {
      fontSize: 24,
      minFontSize: 14,
      color: "#1f2937", // zinc-800
      hindiColor: "#374151", // zinc-700
      spacing: 0.3,
    },
    options: {
      fontSize: 16,
      minFontSize: 12,
      color: "#4b5563", // zinc-600
      spacing: 0.1,
    }
  }
};
