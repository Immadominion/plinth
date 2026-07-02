"use client";

import { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";

/* Decorative doodle backgrounds for the problem cards.
   Both fill their container; the line art shows over the card colour. */

export function LottieBg({ src }: { src: string }) {
  return (
    <DotLottieReact
      src={src}
      loop
      autoplay
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export function RiveBg({
  src,
  artboard,
  stateMachine,
}: {
  src: string;
  artboard?: string;
  /** name a state machine when the motion is driven by one (incl. nested artboards),
      e.g. losing.riv's "cryingvinbadge" — playing the same-named timeline won't run it. */
  stateMachine?: string;
}) {
  const { rive, RiveComponent } = useRive({
    src,
    artboard, // some files default to an empty artboard — pick the real scene by name
    stateMachines: stateMachine,
    // Let Rive drive the state machine when named; otherwise we start the timeline(s)
    // ourselves below (autoplay alone leaves several of these files on a still frame).
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  useEffect(() => {
    if (!rive) return;
    try {
      if (stateMachine) {
        rive.play(stateMachine);
        return;
      }
      const anims = rive.animationNames;
      if (anims && anims.length) {
        rive.play(anims);
      } else {
        const machines = rive.stateMachineNames;
        if (machines && machines.length) rive.play(machines);
      }
    } catch {
      /* instance not ready — the next load will retry */
    }
  }, [rive, stateMachine]);

  return <RiveComponent style={{ width: "100%", height: "100%" }} />;
}
