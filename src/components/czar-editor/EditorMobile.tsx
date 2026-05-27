import React, { useState } from "react";
import { CZ_VOICES } from "./editorData";
import { useCzDictation, useCzDropZone } from "./editorHooks";
import { CzMobileSettings, CzMobileMic } from "./EditorExtras";

function CzMobileVoiceSheet({
  open, onClose, voice, setVoice,
}: {
  open: boolean; onClose: () => void; voice: string; setVoice: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="cz-m-sheet-backdrop" onClick={onClose}>
      <div className="cz-m-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="cz-m-sheet-handle" />
        <div className="cz-m-sheet-h">
          <span>Voice library</span>
          <button className="cz-m-sheet-close" onClick={onClose}>Done</button>
        </div>
        {CZ_VOICES.map((v) => (
          <div key={v.id} className="cz-voice-chip"
            data-active={voice === v.id ? "true" : "false"}
            onClick={() => { setVoice(v.id); onClose(); }}>
            <span className="cz-voice-glyph">{v.glyph}</span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span className="cz-voice-name">{v.name}</span>
              <span className="cz-voice-tag" style={{ marginTop: 2 }}>{v.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CzarMobile() {
  const [voice, setVoice] = useState("newsletter");
  const [voiceSheet, setVoiceSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const dict = useCzDictation();
  const drop = useCzDropZone();

  const v = CZ_VOICES.find((x) => x.id === voice) ?? CZ_VOICES[3];

  return (
    <div className="cz-app">
      <div className="cz-m">

        <div className="cz-m-bar">
          <button className="cz-m-iconbtn" title="Pieces">≡</button>
          <div className="cz-m-bar-title">
            <span className="cz-m-brand">czar</span>
            <span className="cz-m-doc">letter to the founders</span>
          </div>
          <button className="cz-m-iconbtn" title="Settings"
            onClick={() => setSettingsSheet(true)} style={{ fontSize: 16 }}>⚙</button>
        </div>

        <div className="cz-m-voice">
          <span className="cz-voice-glyph">{v.glyph}</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="cz-m-voice-name">{v.name}</span>
            <span className="cz-m-voice-tag">{v.tag} · writing mode</span>
          </div>
          <button className="cz-m-voice-switch" onClick={() => setVoiceSheet(true)}>switch</button>
        </div>

        <div className="cz-m-canvas" {...drop.handlers} style={{ position: "relative" }}>
          {drop.dragOver && (
            <div className="cz-m-dropzone">
              <span style={{
                fontFamily: "var(--f-display)", fontStyle: "italic",
                fontWeight: 700, fontSize: 48, color: "var(--primary)", lineHeight: 1,
              }}>§</span>
              <p style={{
                fontFamily: "var(--f-display)", fontStyle: "italic", fontWeight: 600,
                fontSize: 18, color: "var(--ink)", margin: 0,
              }}>Drop to import</p>
              <p style={{
                fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.16em",
                textTransform: "uppercase", color: "var(--ink-faint)", margin: 0,
              }}>.txt · .md · .docx · audio</p>
            </div>
          )}
          {drop.imported && (
            <div className="cz-imported" style={{ left: 16, bottom: 16, right: 16 }}>
              <span className="cz-imported-icon">§</span>
              <div className="cz-imported-body">
                <span className="cz-imported-name">Imported · {drop.imported.name}</span>
                <span className="cz-imported-meta">{drop.imported.kind} · {drop.imported.words}w</span>
              </div>
              <button className="cz-imported-close" onClick={() => drop.setImported(null)}>×</button>
            </div>
          )}

          <h1>A letter to the founders, with apology</h1>
          <p className="cz-m-deck">For Margaret, who said the thing first.</p>

          <p>
            When we started, we said three things plainly: that we would{" "}
            <span className="cz-flag">never raise outside money</span>, that the work
            would come before the company, and that Wednesdays would be sacred.
            We meant it.
          </p>

          <p>
            The first promise lasted eight months. The second, fourteen.
            The third — the one I want to apologise for — we broke on a Wednesday,
            of course, two summers ago, when the board call ran long and Margaret
            stayed at her desk.
          </p>

          <h2>What we said we would build</h2>
          <p>
            A small software company. A roof and a payroll and enough left over
            for the kind of long lunches that good ideas need. We did not say
            <em> "platform." </em>We said: a place where the writing comes first.
          </p>

          <p>I have the email. I have re-read it.</p>
        </div>

        <div className="cz-m-status">
          <span>1,842 words</span>
          <span><strong>saved</strong> · 22 sec</span>
          <span>7:12 read</span>
        </div>

        <div className="cz-m-tools">
          <button className="cz-m-tool cz-m-tool-bold"
            data-active={active === "b" ? "true" : "false"}
            onClick={() => setActive(active === "b" ? null : "b")}>B</button>
          <button className="cz-m-tool cz-m-tool-italic"
            data-active={active === "i" ? "true" : "false"}
            onClick={() => setActive(active === "i" ? null : "i")}>I</button>
          <button className="cz-m-tool"
            style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontWeight: 600 }}>Aa</button>
          <button className="cz-m-tool"
            data-live={dict.live ? "true" : "false"}
            title="Dictate"
            onClick={() => (dict.live ? dict.stop() : dict.start())}
            style={{ fontSize: 16 }}>
            {dict.live ? "◉" : "◎"}
          </button>
          <button className="cz-m-tool-ai cz-m-tool" title="Czar AI">§</button>
        </div>

        <CzMobileVoiceSheet open={voiceSheet} onClose={() => setVoiceSheet(false)}
          voice={voice} setVoice={setVoice} />
        <CzMobileSettings open={settingsSheet} onClose={() => setSettingsSheet(false)}
          activeVoice={voice} setVoice={setVoice} />
        <CzMobileMic open={dict.live} dict={dict}
          onClose={() => dict.stop()} />
      </div>
    </div>
  );
}
