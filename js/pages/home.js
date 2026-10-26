/**
 * Homepage. Everything on it is static HTML apart from the shared header and footer.
 * The "Search real outcomes" section is a picture (assets/preview.png), not live
 * filters: search opens once there's enough data. Placeholder cards shimmer
 * until the picture has loaded, then it fades in over them.
 */
import { renderLayout } from "../components/layout.js?v=cb1ff16d";
import { $ } from "../lib/dom.js?v=5a71cd6c";

renderLayout();

const frame = $(".shot-frame");
const img = $("img", frame);
const show = () => frame.classList.add("loaded");
if (img.complete && img.naturalWidth) show();
else img.addEventListener("load", show, { once: true });
