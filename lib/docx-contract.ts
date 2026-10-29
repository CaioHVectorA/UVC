export type DocxSplit = "none" | "h1" | "h2";
export type DocxPreview = {
  importId: string;
  digest: string;
  fileName: string;
  title: string;
  words: number;
  warnings: string[];
  modes: {
    value: DocxSplit;
    label: string;
    sections: { title: string; words: number }[];
  }[];
};
