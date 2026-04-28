import { get, set, del, keys } from "idb-keyval";

const PREFIX = "board:";
const AUTOSAVE_KEY = "board:__autosave__";

export async function autosaveBoard(state) {
  await set(AUTOSAVE_KEY, { ...state, updatedAt: Date.now() });
}

export async function loadAutosave() {
  return (await get(AUTOSAVE_KEY)) || null;
}

export async function saveBoard(name, state) {
  const id = `${PREFIX}${name}`;
  await set(id, { ...state, name, updatedAt: Date.now() });
  return id;
}

export async function loadBoard(name) {
  return (await get(`${PREFIX}${name}`)) || null;
}

export async function deleteBoard(name) {
  await del(`${PREFIX}${name}`);
}

export async function listBoards() {
  const allKeys = await keys();
  return allKeys
    .filter((k) => typeof k === "string" && k.startsWith(PREFIX) && k !== AUTOSAVE_KEY)
    .map((k) => k.replace(PREFIX, ""));
}
