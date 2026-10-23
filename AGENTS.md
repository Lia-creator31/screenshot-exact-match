<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Invitation UI lives in `src/components/wedding/`; all names, dates, venues, banks and wishes come from `data.ts` so copy changes never touch layout code.
- The entry gate (`PalaceGate.tsx`) is the single main gate: the user's original floral arch (`Gate.png`) composited into a painted palace-wall scene, with wrought-iron door leaves cut to the arch opening. It is driven by the single `T` timeline and `DOOR` percentages measured on that artwork, so regenerate frame + doors together if the artwork changes. Never add a second gate/arch elsewhere in the entry.
- The gate has no picture of its own behind the doors: `GardenIntro` is always mounted under the see-through gate and starts its timeline via `play` when entry starts, following the exported `GATE_T`/`GATE_ORIGIN`, so the doorway reveals the real garden page and the hand-off has no cut.
- Large decorative images ship as optimized local `.webp` imports; original user media stays as `.asset.json` CDN pointers.
