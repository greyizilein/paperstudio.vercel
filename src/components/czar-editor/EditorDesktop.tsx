import React, { useState } from 'react';
import { CZ_VOICES, CZ_PIECES, CZ_OUTLINE, CZ_SUGGESTIONS } from './editorData';
import { useCzDictation, useCzDropZone } from './editorHooks';
import { CzDropOverlay, CzImportedChip, CzMicPopover, CzSettingsModal } from './EditorExtras';

interface FormatState {
  block: string; font: string; size: string;
  b: boolean; i: boolean; u: boolean; s: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  lh: string;
}

type SectionId = 'modes' | 'train' | 'editor' | 'dictation' | 'import' | 'shortcuts' | 'account';

// ── Title Bar ────────────────────────────────────────────────
function CzTitlebar({ docTitle, setDocTitle, mode, setMode, onOpenSettings }: {
  docTitle: string;
  setDocTitle: (t: string) => void;
  mode: string;
  setMode: (m: string) => void;
  onOpenSettings: (section?: SectionId) => void;
}) {
  return (
    <div className="cz-titlebar">
      <div className="cz-brand">
        <div className="cz-brand-mark">czar</div>
        <div className="cz-brand-meta">drafting room</div>
      </div>
      <div className="cz-doc-title">
        <span
          className="cz-doc-name"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => setDocTitle(e.currentTarget.textContent ?? docTitle)}
        >{docTitle}</span>
        <span className="cz-doc-sep">·</span>
        <span className="cz-doc-mode-pill">letter</span>
      </div>
      <div className="cz-titlebar-actions">
        <div className="cz-mode-tabs">
          {['Edit', 'Read', 'Voice'].map((m) => (
            <button key={m} data-active={mode === m.toLowerCase() ? 'true' : undefined}
              onClick={() => setMode(m.toLowerCase())}>{m}</button>
          ))}
        </div>
        <button className="cz-cbtn" style={{ height: 30 }} title="History">⤺</button>
        <button className="cz-cbtn" style={{ height: 30, fontSize: 15 }} title="Settings"
          onClick={() => onOpenSettings('modes')}>⚙</button>
        <button className="cz-cbtn" style={{
          height: 30, background: 'var(--primary)', color: 'var(--primary-ink)',
          fontWeight: 600, padding: '0 14px', borderColor: 'var(--primary)',
        }}>Share</button>
      </div>
    </div>
  );
}

// ── Ribbon ────────────────────────────────────────────────────
function CzCGroup({ label, ai = false, children }: { label: string; ai?: boolean; children: React.ReactNode }) {
  return (
    <div className={'cz-cgroup' + (ai ? ' cz-cgroup-ai' : '')}>
      <div className="cz-cgroup-row">{children}</div>
      <div className="cz-cgroup-label">{label}</div>
    </div>
  );
}

function CzComposer({ format, setFormat, dictLive, onMicToggle, onOpenSettings }: {
  format: FormatState;
  setFormat: (f: FormatState) => void;
  dictLive: boolean;
  onMicToggle: () => void;
  onOpenSettings: (section?: SectionId) => void;
}) {
  const tog = (k: keyof FormatState) => setFormat({ ...format, [k]: !(format[k] as boolean) });
  const set = (k: keyof FormatState, v: string) => setFormat({ ...format, [k]: v });

  return (
    <div className="cz-composer">
      <CzCGroup label="Style">
        <select className="cz-csel cz-csel-wide" value={format.block} onChange={(e) => set('block', e.target.value)}>
          <option>Body — Fraunces 16</option>
          <option>Heading 1</option><option>Heading 2</option><option>Heading 3</option>
          <option>Pull quote</option><option>Lede paragraph</option>
        </select>
      </CzCGroup>
      <CzCGroup label="Font">
        <select className="cz-csel cz-csel-wide" value={format.font} onChange={(e) => set('font', e.target.value)}>
          <option>Fraunces</option><option>Inter</option><option>JetBrains Mono</option>
          <option>Georgia</option><option>Söhne</option>
        </select>
        <select className="cz-csel cz-csel-narrow" value={format.size} onChange={(e) => set('size', e.target.value)}>
          {['10','11','12','13','14','15','16','17','18','20','24','28','32'].map(s => <option key={s}>{s}</option>)}
        </select>
      </CzCGroup>
      <CzCGroup label="Format">
        <button className="cz-cbtn cz-cbtn-bold"   data-active={format.b ? 'true' : undefined} onClick={() => tog('b')}>B</button>
        <button className="cz-cbtn cz-cbtn-italic" data-active={format.i ? 'true' : undefined} onClick={() => tog('i')}>I</button>
        <button className="cz-cbtn cz-cbtn-under"  data-active={format.u ? 'true' : undefined} onClick={() => tog('u')}>U</button>
        <button className="cz-cbtn cz-cbtn-strike" data-active={format.s ? 'true' : undefined} onClick={() => tog('s')}>S</button>
        <button className="cz-cbtn" title="Small caps" style={{ fontVariant: 'small-caps', fontWeight: 600, fontSize: 11 }}>sc</button>
        <button className="cz-cbtn" title="Superscript" style={{ fontSize: 10 }}>x²</button>
      </CzCGroup>
      <CzCGroup label="Color">
        <button className="cz-cbtn cz-cbtn-color" title="Text color"
                style={{ '--swatch': 'var(--primary)' } as React.CSSProperties}>A</button>
        <button className="cz-cbtn cz-cbtn-color" title="Highlight"
                style={{ '--swatch': 'hsl(50 95% 70%)' } as React.CSSProperties}>
          <span style={{ background: 'hsl(50 95% 70% / 0.4)', padding: '0 3px', borderRadius: 2 }}>a</span>
        </button>
      </CzCGroup>
      <CzCGroup label="Align">
        <button className="cz-cbtn" data-active={format.align === 'left' ? 'true' : undefined}    onClick={() => set('align', 'left')}    title="Left">⫷</button>
        <button className="cz-cbtn" data-active={format.align === 'center' ? 'true' : undefined}  onClick={() => set('align', 'center')}  title="Center">⫶</button>
        <button className="cz-cbtn" data-active={format.align === 'right' ? 'true' : undefined}   onClick={() => set('align', 'right')}   title="Right">⫸</button>
        <button className="cz-cbtn" data-active={format.align === 'justify' ? 'true' : undefined} onClick={() => set('align', 'justify')} title="Justify">≡</button>
      </CzCGroup>
      <CzCGroup label="Flow">
        <select className="cz-csel cz-csel-narrow" value={format.lh} onChange={(e) => set('lh', e.target.value)} title="Line height">
          <option>1.4</option><option>1.5</option><option>1.65</option><option>1.8</option><option>2.0</option>
        </select>
        <button className="cz-cbtn" title="Indent">→|</button>
        <button className="cz-cbtn" title="Outdent">|←</button>
      </CzCGroup>
      <CzCGroup label="List">
        <button className="cz-cbtn" title="Bulleted">•</button>
        <button className="cz-cbtn" title="Numbered">1.</button>
        <button className="cz-cbtn" title="Quote">❝</button>
      </CzCGroup>
      <CzCGroup label="Insert">
        <button className="cz-cbtn" title="Link">↗</button>
        <button className="cz-cbtn" title="Footnote">†</button>
        <button className="cz-cbtn" title="Image">▣</button>
        <button className="cz-cbtn" title="Em-dash">—</button>
      </CzCGroup>
      <CzCGroup label="Czar AI" ai>
        <button className="cz-cbtn" title="Tighten"><i>§</i> Tighten</button>
        <button className="cz-cbtn" title="Voice" onClick={() => onOpenSettings('modes')}><i>§</i> Voice…</button>
        <button className="cz-cbtn" title="Continue"><i>§</i> Continue</button>
      </CzCGroup>
      <CzCGroup label="Dictate">
        <button className="cz-cbtn" data-live={dictLive ? 'true' : undefined}
                title="Dictate (⌥ Space)" onClick={onMicToggle} style={{ minWidth: 30, fontSize: 14 }}>
          {dictLive ? '◉' : '◎'}
        </button>
        <button className="cz-cbtn" title="Dictation settings"
                onClick={() => onOpenSettings('dictation')} style={{ fontSize: 11 }}>EN-US</button>
      </CzCGroup>
      <CzCGroup label="Import">
        <button className="cz-cbtn" title="Import file…" onClick={() => onOpenSettings('import')}>↓</button>
      </CzCGroup>
      <div className="cz-composer-spacer" />
      <CzCGroup label="Find">
        <button className="cz-cbtn" title="Find">⌕</button>
      </CzCGroup>
    </div>
  );
}

// ── Left rail ─────────────────────────────────────────────────
function CzRail({ activeVoice, setVoice }: { activeVoice: string; setVoice: (id: string) => void }) {
  return (
    <aside className="cz-rail">
      <div className="cz-rail-section">
        <div className="cz-rail-heading">
          Pieces
          <button className="cz-rail-add" title="New piece">+</button>
        </div>
        {CZ_PIECES.map((p) => (
          <div key={p.id} className="cz-piece" data-active={p.active ? 'true' : undefined}>
            <span className="cz-piece-dot" />
            <span className="cz-piece-name">{p.name}</span>
            <span className="cz-piece-meta">{p.meta2 || p.meta}</span>
          </div>
        ))}
      </div>
      <div className="cz-rail-section">
        <div className="cz-rail-heading">Outline</div>
        {CZ_OUTLINE.map((o) => (
          <div key={o.id} className="cz-outline-item"
               data-level={o.level} data-current={o.current ? 'true' : undefined}>{o.text}</div>
        ))}
      </div>
      <div className="cz-rail-section">
        <div className="cz-rail-heading">
          Voice library
          <button className="cz-rail-add" title="Train new voice">+</button>
        </div>
        {CZ_VOICES.map((v) => (
          <div key={v.id} className="cz-voice-chip"
               data-active={activeVoice === v.id ? 'true' : undefined}
               onClick={() => setVoice(v.id)}>
            <span className="cz-voice-glyph">{v.glyph}</span>
            <span className="cz-voice-name">{v.name}</span>
            <span className="cz-voice-tag">{v.tag}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Canvas / leaf ─────────────────────────────────────────────
function CzLeaf({ drop }: { drop: ReturnType<typeof useCzDropZone> }) {
  return (
    <main className="cz-canvas" {...drop.handlers}>
      <CzDropOverlay visible={drop.dragOver} />
      <CzImportedChip file={drop.imported} onClose={() => drop.setImported(null)} />
      <article className="cz-leaf">
        <div className="cz-leaf-runhead">
          <span>czar — drafting room</span>
          <span>folio 1 · pg. 3</span>
        </div>
        <h1>A letter to the founders, with apology</h1>
        <p className="cz-leaf-deck">
          For Margaret, who said the thing first — and for everyone we kept waiting in the Wednesday meeting.
        </p>
        <p className="cz-drop">
          When we started, we said three things plainly, the way you say things when you still believe
          them: that we would <span className="cz-flag">never raise outside money</span>, that the work
          would always come before the company, and that Wednesdays would be sacred.
          We meant it. <span className="cz-cursor" />
        </p>
        <p>
          The first promise lasted eight months. The second, fourteen. The third — and this is the one
          I want to apologise for — we broke <span className="cz-flag cz-flag-grammar">on a Wednesday, of course</span>,
          two summers ago, when the board call ran long and Margaret stayed at her desk and nobody noticed
          until the lights went off.
        </p>
        <h2>What we said we would build</h2>
        <p>
          A small software company. A roof and a payroll and enough left over for the kind of long lunches
          that good ideas need. We did not say "platform." We did not say "category-defining." We said:
          <em> a place where the writing comes first</em>. I have the email. I have re-read it.
        </p>
        <p>
          The margin note on the right has Margaret's reply, which I am only now able to read without
          flinching. She said the thing we needed to hear about the deck, which is that it was beautiful
          and also untrue.
        </p>
        <div className="cz-margin-note" style={{ top: 360 }}>
          <div className="cz-mn-h">Margaret · 2 weeks ago</div>
          this paragraph is the whole letter. Consider opening here?
        </div>
      </article>
    </main>
  );
}

// ── Inspector ─────────────────────────────────────────────────
function CzMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="cz-meter">
      <span className="cz-meter-label">{label}</span>
      <span className="cz-meter-bar" style={{ '--v': value + '%' } as React.CSSProperties}>
        <span className="cz-meter-tick" style={{ left: '50%' }} />
      </span>
      <span className="cz-meter-val">{value}</span>
    </div>
  );
}

function CzInspector({ voice, length, setLength, audience, setAudience }: {
  voice: string; length: string; setLength: (l: string) => void;
  audience: string; setAudience: (a: string) => void;
}) {
  const v = CZ_VOICES.find((x) => x.id === voice) || CZ_VOICES[0];
  return (
    <aside className="cz-inspector">
      <div className="cz-insp-section">
        <div className="cz-insp-h">
          The voice
          <button className="cz-insp-h-action">tune</button>
        </div>
        <div className="cz-voice-card">
          <div className="cz-voice-card-head">
            <span className="cz-voice-card-name">{v.name}</span>
            <span className="cz-voice-card-tag">{v.tag}</span>
          </div>
          <p className="cz-voice-card-desc">{v.desc}</p>
          <CzMeter label="Warmth"    value={v.meters.warmth} />
          <CzMeter label="Formality" value={v.meters.formality} />
          <CzMeter label="Brevity"   value={v.meters.brevity} />
          <CzMeter label="Wit"       value={v.meters.wit} />
        </div>
      </div>
      <div className="cz-insp-section">
        <div className="cz-insp-h">Audience &amp; length</div>
        <div className="cz-insp-row">
          <label>Writing for</label>
          <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} />
        </div>
        <div className="cz-insp-row">
          <label>Target length</label>
          <div className="cz-length-pill">
            {['short', 'medium', 'long', 'epic'].map((l) => (
              <button key={l} data-active={length === l ? 'true' : undefined} onClick={() => setLength(l)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="cz-insp-section">
        <div className="cz-insp-h">
          Czar is reading
          <button className="cz-insp-h-action">3</button>
        </div>
        {CZ_SUGGESTIONS.map((s) => (
          <div key={s.id} className="cz-sugg" data-tone={s.kind}>
            <div className="cz-sugg-kind">
              <span>{s.kind === 'voice' ? 'Voice shift' : s.kind === 'grammar' ? 'Grammar' : 'Cut'}</span>
              <span className="cz-sugg-tone-tag">{s.tone}</span>
            </div>
            <p className="cz-sugg-was">{s.was}</p>
            <p className="cz-sugg-now">{s.now}</p>
            <div className="cz-sugg-actions">
              <button className="cz-sugg-yes">Accept</button>
              <button>Dismiss</button>
              <button>Why?</button>
            </div>
          </div>
        ))}
      </div>
      <div className="cz-insp-section">
        <div className="cz-insp-h">The shape of it</div>
        <div className="cz-stats">
          <div className="cz-stat"><div className="cz-stat-val">1,842</div><div className="cz-stat-lbl">words</div></div>
          <div className="cz-stat"><div className="cz-stat-val">7:12</div><div className="cz-stat-lbl">to read</div></div>
          <div className="cz-stat"><div className="cz-stat-val">14.4</div><div className="cz-stat-lbl">avg sent.</div></div>
          <div className="cz-stat"><div className="cz-stat-val">9th</div><div className="cz-stat-lbl">grade</div></div>
        </div>
      </div>
    </aside>
  );
}

// ── Status bar ────────────────────────────────────────────────
function CzStatus() {
  return (
    <div className="cz-status">
      <span><span className="cz-status-dot" /> Saved · 22 sec ago</span>
      <span>folio <strong>1</strong> / 3</span>
      <span>line <strong>14</strong>, col <strong>62</strong></span>
      <div className="cz-status-spacer" />
      <div className="cz-status-cluster">
        <button>spell · on</button>
        <button>focus mode</button>
        <button>view · letter</button>
        <span>100 %</span>
      </div>
    </div>
  );
}

// ── Desktop editor ────────────────────────────────────────────
export function CzarDesktop() {
  const [docTitle, setDocTitle] = useState('A letter to the founders, with apology');
  const [mode, setMode] = useState('edit');
  const [voice, setVoice] = useState('newsletter');
  const [length, setLength] = useState('medium');
  const [audience, setAudience] = useState('My two co-founders, and Margaret');
  const [format, setFormat] = useState<FormatState>({
    block: 'Body — Fraunces 16', font: 'Fraunces', size: '16',
    b: false, i: true, u: false, s: false, align: 'left', lh: '1.65',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SectionId>('modes');
  const dict = useCzDictation();
  const drop = useCzDropZone();

  const openSettings = (section: SectionId = 'modes') => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  return (
    <div className="cz-app">
      <CzTitlebar docTitle={docTitle} setDocTitle={setDocTitle}
                  mode={mode} setMode={setMode} onOpenSettings={openSettings} />
      <CzComposer format={format} setFormat={setFormat}
                  dictLive={dict.live}
                  onMicToggle={() => dict.live ? dict.stop() : dict.start()}
                  onOpenSettings={openSettings} />
      <div className="cz-stage">
        <CzRail activeVoice={voice} setVoice={setVoice} />
        <CzLeaf drop={drop} />
        <CzInspector voice={voice} length={length} setLength={setLength}
                     audience={audience} setAudience={setAudience} />
      </div>
      <CzStatus />
      <CzMicPopover open={dict.live} live={dict.live}
                    seconds={dict.seconds} final={dict.final} interim={dict.interim}
                    onClose={() => dict.stop()}
                    onInsert={() => {}}
                    style={{ right: 300, bottom: 60 }} />
      <CzSettingsModal open={settingsOpen}
                       onClose={() => setSettingsOpen(false)}
                       activeVoice={voice} setVoice={setVoice}
                       initialSection={settingsSection} />
    </div>
  );
}
