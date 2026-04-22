import type { FolderNode, Layout, SortRule } from "./types";
import { uid } from "./uid";

const r = (
  name: string,
  extensions: string,
  source: string,
  target = "",
  extra: Partial<SortRule> = {}
): SortRule => ({
  id: uid(),
  name,
  match: "ext",
  extensions,
  target,
  source,
  ...extra,
});

const node = (
  name: string,
  children: FolderNode[] = [],
  rules: SortRule[] = [],
  icon?: string
): FolderNode => ({
  id: uid(),
  name,
  icon,
  children,
  rules,
});

const HOME = "%USERPROFILE%";
const DL = `${HOME}\\Downloads`;
const DT = `${HOME}\\Desktop`;
const DOC = `${HOME}\\Documents`;

export const TEMPLATES: Layout[] = [
  {
    id: "tpl-developer",
    name: "💻 Developer Cosmos",
    rootPath: "C:\\Dev",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Dev", [
      node("Projects", [node("Web"), node("Python"), node("Rust"), node("Tools")], [], "🚀"),
      node("Assets", [], [r("Images", ".jpg,.jpeg,.png,.svg,.webp", DL, "Images")], "🎨"),
      node("Docs", [], [r("PDFs & docs", ".pdf,.md,.docx", DL, "Docs")], "📚"),
      node("Temp"),
    ], [], "💻"),
  },
  {
    id: "tpl-gamer",
    name: "🎮 Gamer Galaxy",
    rootPath: "D:\\Gaming",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Gaming", [
      node("Games", [node("Installed"), node("Mods"), node("Saves")]),
      node("Clips", [], [r("Game clips", ".mp4,.mkv", `${HOME}\\Videos\\Captures`)]),
      node("Screenshots", [], [r("Screens", ".png,.jpg", DT)]),
    ]),
  },
  {
    id: "tpl-hacker",
    name: "🧠 Cyber / Recon",
    rootPath: "C:\\Ops",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Root", [
      node("Operations", [node("Payloads"), node("Logs"), node("Recon"), node("Scripts")]),
      node("Encrypted"),
      node("Dropzone", [], [r("All from Downloads", "*", DL)]),
    ]),
  },
  {
    id: "tpl-creator",
    name: "🎥 Content Creator",
    rootPath: "E:\\Studio",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Studio", [
      node("Media", [
        node("Raw", [], [r("Video raw", ".mov,.mp4,.mxf,.r3d", DL)]),
        node("Edited"),
        node("Exports"),
      ]),
      node("Thumbnails", [], [r("Thumbs", ".png,.jpg", DT)]),
      node("Audio", [], [r("Audio", ".wav,.mp3,.flac,.aiff", DL)]),
    ]),
  },
  {
    id: "tpl-clean",
    name: "🧹 Clean Desktop & Downloads",
    rootPath: "%USERPROFILE%\\Organized",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Organized", [
      node("Pictures", [], [r("Images", ".jpg,.jpeg,.png,.gif,.webp,.bmp", DT)]),
      node("Videos", [], [r("Videos", ".mp4,.mov,.mkv,.avi,.webm", DL)]),
      node("Archives", [], [r("Archives", ".zip,.rar,.7z,.tar,.gz", DL)]),
      node("Documents", [], [r("Docs", ".pdf,.docx,.doc,.xlsx,.pptx,.txt,.md", DT)]),
      node("Installers", [], [r("Installers", ".exe,.msi,.dmg", DL)]),
    ]),
  },
  {
    id: "tpl-photo",
    name: "📷 Photographer Archive",
    rootPath: "F:\\Photos",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Photos", [
      node("Imports", [], [
        r("RAW imports", ".cr2,.cr3,.nef,.arw,.raf,.dng", `${HOME}\\Pictures\\Imports`, "", { archiveByDate: true }),
      ]),
      node("Edits"),
      node("Exports", [], [r("JPEG exports", ".jpg,.jpeg", `${HOME}\\Pictures\\Exports`, "", { archiveByDate: true })]),
    ]),
  },
  {
    id: "tpl-student",
    name: "🎓 Student Workspace",
    rootPath: "C:\\School",
    createdAt: 0,
    updatedAt: 0,
    tree: node("School", [
      node("Semester", [node("Math"), node("Science"), node("Humanities")]),
      node("Notes", [], [r("Notes", ".md,.txt,.docx", DT)]),
      node("Slides", [], [r("Slides", ".pptx,.pdf", DL)]),
      node("Submissions"),
    ]),
  },
  {
    id: "tpl-music",
    name: "🎧 Music Producer",
    rootPath: "D:\\Studio",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Studio", [
      node("Sessions"),
      node("Samples", [], [r("Samples", ".wav,.aif,.flac", DL)]),
      node("Stems"),
      node("Masters", [], [r("Masters", ".wav,.mp3", DT)]),
    ]),
  },
  {
    id: "tpl-bigfiles",
    name: "🪐 Archive big files (>500MB)",
    rootPath: "D:\\Archive",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Archive", [
      {
        ...node("BigFiles"),
        rules: [
          {
            id: uid(),
            name: "Files larger than 500 MB",
            match: "size",
            sizeOp: "gt",
            sizeMb: 500,
            extensions: "*",
            source: DL,
            target: "BigFiles",
            archiveByDate: true,
          },
        ],
      },
    ]),
  },
  {
    id: "tpl-old",
    name: "🕰️ Archive old files (>180 days)",
    rootPath: "D:\\Archive",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Archive", [
      {
        ...node("Old"),
        rules: [
          {
            id: uid(),
            name: "Older than 180 days",
            match: "date",
            dateOp: "older",
            days: 180,
            extensions: "*",
            source: DOC,
            target: "Old",
            archiveByDate: true,
          },
        ],
      },
    ]),
  },
  {
    id: "tpl-screens",
    name: "📸 Screenshots by month",
    rootPath: "%USERPROFILE%\\Pictures\\Sorted",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Sorted", [
      {
        ...node("Screenshots"),
        rules: [
          {
            id: uid(),
            name: "Screenshot keyword",
            match: "keyword",
            keyword: "Screenshot,Capture,Snip",
            extensions: "*",
            source: DT,
            target: "",
            archiveByDate: true,
          },
        ],
      },
    ]),
  },
  {
    id: "tpl-minimal",
    name: "🌌 Minimal starter",
    rootPath: "C:\\",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Root"),
  },
];
