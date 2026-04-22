import type { FolderNode, Layout } from "./types";
import { uid } from "./uid";

const node = (name: string, children: FolderNode[] = [], rules = []): FolderNode => ({
  id: uid(),
  name,
  children,
  rules,
});

export const TEMPLATES: Layout[] = [
  {
    id: "tpl-developer",
    name: "💻 Developer",
    rootPath: "C:\\",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Dev", [
      node("Projects", [node("Python"), node("Web"), node("Tools")]),
      node("Assets"),
      node("Docs"),
      node("Temp"),
    ]),
  },
  {
    id: "tpl-gamer",
    name: "🎮 Gamer",
    rootPath: "D:\\",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Gaming", [
      node("Games", [node("Installed"), node("Mods"), node("Saves")]),
      node("Clips"),
      node("Screenshots"),
    ]),
  },
  {
    id: "tpl-hacker",
    name: "🧠 Cyber / Hacker",
    rootPath: "C:\\",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Root", [
      node("Operations", [node("Payloads"), node("Logs"), node("Recon"), node("Scripts")]),
      node("Encrypted"),
      node("Dropzone"),
    ]),
  },
  {
    id: "tpl-creator",
    name: "🎥 Content Creator",
    rootPath: "E:\\",
    createdAt: 0,
    updatedAt: 0,
    tree: node("Studio", [
      node("Media", [node("Raw"), node("Edited"), node("Exports")]),
      node("Thumbnails"),
      node("Audio"),
    ]),
  },
  {
    id: "tpl-clean",
    name: "🧹 Clean Desktop & Downloads",
    rootPath: "C:\\Users\\%USERNAME%\\Organized",
    createdAt: 0,
    updatedAt: 0,
    tree: {
      id: uid(),
      name: "Organized",
      children: [
        {
          id: uid(),
          name: "Pictures",
          children: [],
          rules: [
            {
              id: uid(),
              name: "Images from Desktop",
              extensions: ".jpg,.jpeg,.png,.gif,.webp,.bmp",
              target: "Pictures",
              source: "%USERPROFILE%\\Desktop",
            },
          ],
        },
        {
          id: uid(),
          name: "Videos",
          children: [],
          rules: [
            {
              id: uid(),
              name: "Videos from Downloads",
              extensions: ".mp4,.mov,.mkv,.avi,.webm",
              target: "Videos",
              source: "%USERPROFILE%\\Downloads",
            },
          ],
        },
        {
          id: uid(),
          name: "Archives",
          children: [],
          rules: [
            {
              id: uid(),
              name: "Archives from Downloads",
              extensions: ".zip,.rar,.7z,.tar,.gz",
              target: "Archives",
              source: "%USERPROFILE%\\Downloads",
            },
          ],
        },
        {
          id: uid(),
          name: "Documents",
          children: [],
          rules: [
            {
              id: uid(),
              name: "Docs from Desktop",
              extensions: ".pdf,.docx,.doc,.xlsx,.pptx,.txt,.md",
              target: "Documents",
              source: "%USERPROFILE%\\Desktop",
            },
          ],
        },
      ],
      rules: [],
    },
  },
];
