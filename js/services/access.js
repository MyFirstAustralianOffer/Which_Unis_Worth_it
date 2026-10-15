/**
 * Database access. Finishing the form unlocks the full database in this
 * browser. There are no accounts yet, so this is a simple flag.
 */
import { store } from "../lib/dom.js?v=5a71cd6c";

const KEY = "rou_unlocked";

export const isUnlocked = () => store.get(KEY, false) === true;
export const unlock = () => store.set(KEY, true);
