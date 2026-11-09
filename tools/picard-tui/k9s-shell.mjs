/**
 * Picard Relay LCARS terminal shell (cell-drawn frame; no blessed).
 */
import os from 'node:os';
import {PICARD_TUI_VERSION} from './version.mjs';
import {stripAnsi} from './lcars-ui.mjs';
import {ActivityLog, SpinnerController} from './activity-spinner.mjs';
import {runMissionFlow} from './mission-orchestrator.mjs';
import {paintLcarsShell, MIN_FRAME_COLS} from './lcars-frame.mjs';
import {LcarsScreen, parseKeyData} from './lcars-screen.mjs';

const VIEWS = ['OVERVIEW', 'OPERATIONS', 'MISSION', 'CONNECTOR'];

const STEP_DEFS = [
  {id: 1, label: '01 SELECT AGENT'},
  {id: 2, label: '02 TRUSTED WORKSPACE'},
  {id: 3, label: '03 MISSION ORDERS'},
  {id: 4, label: '04 ENGAGE AGENT'},
  {id: 5, label: '05 CONNECTOR HANDSHAKE'},
  {id: 6, label: '06 LOCAL APPLY'},
  {id: 7, label: '07 WORKING TREE DIFF'},
  {id: 8, label: '08 CAPTAIN REVIEW'},
];

export class K9sShell {
  /**
   * @param {{
   *  codingConfig: string,
   *  registryPath: string,
   *  agents: import('./agents.mjs').DetectedAgent[],
   *  workspaces: object[],
   *  colorOn: boolean,
   * }} opts
   */
  constructor(opts) {
    this.codingConfig = opts.codingConfig;
    this.registryPath = opts.registryPath;
    this.agents = opts.agents;
    this.workspaces = opts.workspaces;
    this.colorOn = opts.colorOn;

    /** @type {import('./agents.mjs').DetectedAgent | null} */
    this.selectedAgent = null;
    /** @type {object | null} */
    this.selectedWorkspace = null;
    this.missionTitle = '';
    this.missionBody = '';
    this.titleCursor = 0;
    this.bodyCursor = 0;

    this.agentSelected = 0;
    this.workspaceSelected = 0;

    /** @type {Record<number, 'pending'|'running'|'done'|'error'>} */
    this.stepStatus = {};
    for (const s of STEP_DEFS) this.stepStatus[s.id] = 'pending';

    this._clockInterval = null;
    this._cpuPrev = process.cpuUsage();
    this._cpuPrevTime = Date.now();

    this.activity = new ActivityLog({
      minIntervalMs: 280,
      maxLines: 400,
      onFlush: () => this._render(),
    });

    this.spinner = new SpinnerController({
      intervalMs: 120,
      onTick: (frame, label) => {
        this._spinnerFrame = frame;
        this._spinnerLabel = label;
        this._render();
      },
    });
    this._spinnerActive = false;
    this._spinnerLabel = '';
    this._spinnerFrame = '';

    this._questionResolver = null;
    this.questionPrompt = '';
    this.questionDraft = '';

    this.screen = new LcarsScreen();
    this.viewIndex = 0;
    /** @type {'rail'|'agent'|'workspace'|'title'|'body'|'overview'|'steps'|'connector'|'ops'} */
    this.focus = 'rail';
    this._mainSubFocus = 0;

    this._missionRunning = false;
    this._detachKeys = null;
    this._pollDetach = null;
    this._exiting = false;
  }

  _cols() {
    const c = this.screen.columns();
    return Math.max(MIN_FRAME_COLS, c);
  }

  _rows() {
    const r = this.screen.rows();
    return Math.max(24, r);
  }

  _connectorHintText() {
    return (
      'Connector: live poll/collect/apply lines stream to OPERATIONS when you run a mission (F5 from MISSION).\n' +
      'Esc stops a wait; Ctrl+C exits the whole TUI during polls (same as legacy).\n' +
      'Tab / Shift+Tab: cycle main panes. Ctrl+G: left menu.'
    );
  }

  _overviewLeftText() {
    const a = this.selectedAgent ? `${this.selectedAgent.kind}  ${this.selectedAgent.executable}` : '(none)';
    const ws = this.selectedWorkspace
      ? `${this.selectedWorkspace.id}`
      : '(none)';
    return (
      `Picard LCARS  v${PICARD_TUI_VERSION}\n` +
      `Agent:     ${a}\n` +
      `Workspace: ${ws}\n` +
      `F5: start mission when agent + workspace are set.`
    );
  }

  _overviewLowerText() {
    const root = this.selectedWorkspace?.root || '';
    const rootLine = root ? `Root:      ${root}` : '';
    return (
      `Connector: ${this.codingConfig}\n` +
      `Registry:  ${this.registryPath}` +
      (rootLine ? `\n${rootLine}` : '')
    );
  }

  _telemetryLines() {
    const la = os.loadavg();
    const loadStr = la.map(x => x.toFixed(2)).join(' ');
    const total = os.totalmem();
    const free = os.freemem();
    const usedMb = Math.round((total - free) / (1024 * 1024));
    const totalMb = Math.round(total / (1024 * 1024));
    const cpu = this._approxCpuPct();
    return {
      line1: `SYS-STAT // ${os.hostname().slice(0, 12).toUpperCase()} | MISSION-SEQ // ${String(PICARD_TUI_VERSION).replace(/\./g, '')}`,
      line2: `CPU approx ${cpu}% | LOAD ${loadStr} | RAM approx ${usedMb}/${totalMb} MB host-local`,
    };
  }

  _approxCpuPct() {
    const u = process.cpuUsage(this._cpuPrev);
    const t = Date.now();
    const dt = Math.max(1, t - this._cpuPrevTime);
    this._cpuPrev = process.cpuUsage();
    this._cpuPrevTime = t;
    const usec = u.user + u.system;
    return Math.min(100, Math.round((usec / 1000 / dt) * 100));
  }

  _clockText() {
    return new Date().toLocaleString(undefined, {hour12: false}) + ' local';
  }

  _footerText() {
    const sp = this._spinnerActive ? `${this._spinnerFrame} ${this._spinnerLabel}  |  ` : '';
    const v = VIEWS[this.viewIndex];
    let sub = '';
    if (v === 'MISSION') sub = 'Tab: Agent|Worksp|Title|Body  |  ';
    else if (v === 'OVERVIEW') sub = 'Tab: Summary|Steps  |  ';
    else if (v === 'CONNECTOR') sub = 'Tab: Connector|Steps  |  ';
    const nav = this.focus === 'rail' ? '[NAV active: 1-4 or arrows, Enter/Tab content]  |  ' : '';
    return (
      sp +
      nav +
      sub +
      '[Q] Quit  |  [Tab] cycle  |  [Ctrl+G] Menu  |  [/] Ops  |  [1-4] View  |  [F5] Start  |  Esc prompt'
    );
  }

  _viewFocusKind() {
    const v = VIEWS[this.viewIndex];
    if (this.focus === 'rail') return 'rail';
    if (v === 'MISSION') {
      if (this._mainSubFocus === 0) return 'agent';
      if (this._mainSubFocus === 1) return 'workspace';
      if (this._mainSubFocus === 2) return 'title';
      return 'body';
    }
    if (v === 'OPERATIONS') return 'ops';
    if (v === 'CONNECTOR') return this._mainSubFocus === 0 ? 'connector' : 'steps';
    return this._mainSubFocus === 0 ? 'overview' : 'steps';
  }

  _buildViewModel() {
    const telem = this._telemetryLines();
    const steps = STEP_DEFS.map(s => ({
      id: s.id,
      label: s.label,
      state: this.stepStatus[s.id] || 'pending',
    }));
    const activityLines = this.activity.getLines().map(l => stripAnsi(l));
    return {
      cols: this._cols(),
      rows: this._rows(),
      views: VIEWS,
      viewIndex: this.viewIndex,
      telemetryLine1: telem.line1,
      telemetryLine2: telem.line2,
      clockText: this._cols() >= 80 ? this._clockText() : undefined,
      footerHints: this._footerText(),
      steps,
      activityLines,
      overviewLeft: this._overviewLeftText(),
      overviewLower: this._overviewLowerText(),
      connectorHint: this._connectorHintText(),
      agents: this.agents,
      agentSelected: this.agentSelected,
      workspaces: this.workspaces,
      workspaceSelected: this.workspaceSelected,
      missionTitle: this.missionTitle,
      missionBody: this.missionBody,
      focus: this._questionResolver ? 'question' : this._viewFocusKind(),
      questionPrompt: this._questionResolver ? this.questionPrompt : undefined,
      questionDraft: this._questionResolver ? this.questionDraft : undefined,
      titleCursor: this.titleCursor,
      bodyCursor: this.bodyCursor,
      navActive: this.focus === 'rail',
    };
  }

  _render() {
    if (this._exiting) return;
    const buf = paintLcarsShell(this._buildViewModel());
    this.screen.draw(buf);
  }

  setMissionStep(id, status) {
    if (this.stepStatus[id] !== undefined) {
      this.stepStatus[id] = status;
      this._render();
    }
  }

  resetMissionSteps() {
    for (const s of STEP_DEFS) this.stepStatus[s.id] = 'pending';
    this._render();
  }

  _pushActivity(line) {
    this.activity.append(String(line ?? ''));
    this._render();
  }

  _setSpinner(active, label) {
    this._spinnerActive = !!active;
    if (active) {
      this._spinnerLabel = String(label ?? '');
      this.spinner.start(this._spinnerLabel);
    } else {
      this.spinner.stop();
      this._spinnerLabel = '';
    }
    this._render();
  }

  _frameQuestion(promptText) {
    return new Promise(resolve => {
      this._questionResolver = resolve;
      this.questionPrompt = stripAnsi(promptText).replace(/\r?\n/g, ' ').trim();
      this.questionDraft = '';
      this._render();
    });
  }

  _resolveQuestion(value) {
    const r = this._questionResolver;
    this._questionResolver = null;
    this.questionPrompt = '';
    this.questionDraft = '';
    if (r) r(value);
    this._render();
  }

  _installPollCancel(onCancel) {
    const handler = chunk => {
      for (const key of parseKeyData(chunk.toString('utf8'))) {
        if (key.name === 'escape') onCancel('escape');
        if (key.ctrl && key.name === 'c') onCancel('sigint');
      }
    };
    process.stdin.on('data', handler);
    return () => process.stdin.off('data', handler);
  }

  _exit(code = 0) {
    this._exiting = true;
    this.destroy();
    process.exit(code);
  }

  _cycleMain(dir) {
    const v = VIEWS[this.viewIndex];
    if (this.focus === 'rail') {
      this.focus = 'main';
      this._mainSubFocus = 0;
      this._render();
      return;
    }
    if (v === 'MISSION') {
      const n = 4;
      this._mainSubFocus = (this._mainSubFocus + dir + n * 10) % n;
    } else if (v === 'OVERVIEW' || v === 'CONNECTOR') {
      this._mainSubFocus = (this._mainSubFocus + dir + 2 * 10) % 2;
    }
    this._render();
  }

  _handleKey(key) {
    if (this._questionResolver) {
      if (key.name === 'escape') {
        this._resolveQuestion(null);
        return;
      }
      if (key.name === 'enter') {
        this._resolveQuestion(this.questionDraft);
        return;
      }
      if (
        key.name === 'backspace' ||
        (key.ctrl && (key.name === 'h' || key.name === 'H'))
      ) {
        this.questionDraft = this.questionDraft.slice(0, -1);
        this._render();
        return;
      }
      if (key.name && key.name.length === 1 && !key.ctrl) {
        const code = key.name.charCodeAt(0);
        if (code >= 32 && code !== 127) {
          this.questionDraft += key.name;
          this._render();
        }
      }
      return;
    }

    if (key.ctrl && key.name === 'c') {
      this._exit(130);
      return;
    }
    if (key.name === 'q' || key.name === 'Q') {
      this._exit(0);
      return;
    }
    if (key.ctrl && (key.name === 'g' || key.name === 'h')) {
      if (key.name === 'g') {
        this.focus = 'rail';
        this._render();
        return;
      }
      this._cycleMain(1);
      return;
    }
    if (key.name === 'f5') {
      this._startMission();
      return;
    }
    if (key.name === '/') {
      this.viewIndex = 1;
      this.focus = 'main';
      this._render();
      return;
    }

    if (key.name >= '1' && key.name <= '4') {
      this.viewIndex = Number(key.name) - 1;
      this._mainSubFocus = 0;
      if (this.focus === 'rail') this._render();
      else {
        this.focus = 'main';
        this._render();
      }
      return;
    }

    if (this.focus === 'rail') {
      if (key.name === 'tab' && !key.shift) {
        this.focus = 'main';
        this._mainSubFocus = 0;
        this._render();
        return;
      }
      if (key.name === 'backtab' || (key.name === 'tab' && key.shift)) {
        this.focus = 'main';
        this._mainSubFocus = 0;
        this._render();
        return;
      }
      if (key.name === 'up' || key.name === 'k') {
        this.viewIndex = Math.max(0, this.viewIndex - 1);
        this._mainSubFocus = 0;
        this._render();
        return;
      }
      if (key.name === 'down' || key.name === 'j') {
        this.viewIndex = Math.min(VIEWS.length - 1, this.viewIndex + 1);
        this._mainSubFocus = 0;
        this._render();
        return;
      }
      if (key.name === 'enter') {
        this.focus = 'main';
        this._mainSubFocus = 0;
        this._render();
        return;
      }
      return;
    }

    if (key.name === 'tab' && !key.shift) {
      this._cycleMain(1);
      return;
    }
    if (key.name === 'backtab' || (key.name === 'tab' && key.shift)) {
      this._cycleMain(-1);
      return;
    }

    const v = VIEWS[this.viewIndex];
    if (v === 'MISSION' && this.focus !== 'rail') {
      this._handleMissionKey(key);
    }
  }

  _handleMissionKey(key) {
    const kind = this._viewFocusKind();
    if (key.name === 'up' || key.name === 'k') {
      if (kind === 'agent' && this.agentSelected > 0) this.agentSelected--;
      if (kind === 'workspace' && this.workspaceSelected > 0) this.workspaceSelected--;
      this._render();
      return;
    }
    if (key.name === 'down' || key.name === 'j') {
      if (kind === 'agent' && this.agentSelected < this.agents.length - 1) this.agentSelected++;
      if (kind === 'workspace' && this.workspaceSelected < this.workspaces.length - 1) this.workspaceSelected++;
      this._render();
      return;
    }
    if (key.name === 'enter') {
      if (kind === 'agent') {
        this.selectedAgent = this.agents[this.agentSelected] ?? null;
        this.setMissionStep(1, 'done');
      }
      if (kind === 'workspace') {
        this.selectedWorkspace = this.workspaces[this.workspaceSelected] ?? null;
        this.setMissionStep(2, 'done');
      }
      if (kind === 'title') {
        this._mainSubFocus = 3;
      }
      if (kind === 'body' && !key.shift) {
        this.missionBody += '\n';
        this.bodyCursor = this.missionBody.length;
      }
      this._render();
      return;
    }
    if (kind === 'title' || kind === 'body') {
      const isBack =
        key.name === 'backspace' || (key.ctrl && (key.name === 'h' || key.name === 'H'));
      if (isBack) {
        if (kind === 'title' && this.missionTitle.length) {
          this.missionTitle = this.missionTitle.slice(0, -1);
          this.titleCursor = this.missionTitle.length;
        }
        if (kind === 'body' && this.missionBody.length) {
          this.missionBody = this.missionBody.slice(0, -1);
          this.bodyCursor = this.missionBody.length;
        }
        this._render();
        return;
      }
      if (key.name && key.name.length === 1 && !key.ctrl) {
        const code = key.name.charCodeAt(0);
        if (code >= 32 && code !== 127) {
          if (kind === 'title') {
            this.missionTitle += key.name;
            this.titleCursor = this.missionTitle.length;
          } else {
            this.missionBody += key.name;
            this.bodyCursor = this.missionBody.length;
          }
          this._render();
        }
      }
    }
    if (key.name >= '1' && key.name <= '9' && kind === 'agent') {
      const i = Number(key.name) - 1;
      if (i < this.agents.length) {
        this.agentSelected = i;
        this.selectedAgent = this.agents[i];
        this.setMissionStep(1, 'done');
        this._render();
      }
    }
    if (key.name >= '1' && key.name <= '9' && kind === 'workspace') {
      const i = Number(key.name) - 1;
      if (i < this.workspaces.length) {
        this.workspaceSelected = i;
        this.selectedWorkspace = this.workspaces[i];
        this.setMissionStep(2, 'done');
        this._render();
      }
    }
  }

  async _startMission() {
    if (this._missionRunning) return;
    const agent = this.selectedAgent;
    const ws = this.selectedWorkspace;
    if (!agent) {
      this._pushActivity('Select an agent in MISSION view, or install a CLI.');
      return;
    }
    if (!ws) {
      this._pushActivity('Select a workspace in MISSION view.');
      return;
    }

    this._missionRunning = true;
    this.resetMissionSteps();
    this.activity.clear();
    this._pushActivity('--- Mission start ---');
    this.viewIndex = 1;
    this.focus = 'main';
    this._render();

    const nodeExe = process.execPath;
    const io = {
      log: line => this._pushActivity(line),
      question: promptText => this._frameQuestion(promptText),
      installPollCancel: onCancel => this._installPollCancel(onCancel),
      gridW: () => Math.max(40, this._cols() - 4),
      colorOn: false,
      setMissionStep: (id, st) => this.setMissionStep(id, st),
      setSpinner: (active, label) => this._setSpinner(active, label),
      verbosePollLog: true,
    };

    try {
      await runMissionFlow({
        io,
        workspaceId: ws.id,
        workspaceRoot: ws.root,
        workspaceTests: ws.testCommands ?? [],
        codingConfig: this.codingConfig,
        registryPath: this.registryPath,
        agent,
        nodeExe,
        prefillMission: {title: this.missionTitle, missionText: this.missionBody},
      });
      this._pushActivity('--- Mission flow finished ---');
    } catch (e) {
      this._pushActivity(String(e?.stack || e?.message || e));
    } finally {
      this._missionRunning = false;
      this._setSpinner(false);
    }
  }

  async run() {
    if ((process.stdout.columns || 0) < MIN_FRAME_COLS) {
      console.error(
        `Terminal width ${process.stdout.columns || 0} is below ${MIN_FRAME_COLS}. Use Windows Terminal at a wider window.`
      );
      process.exitCode = 2;
      return;
    }

    this.screen.enter();
    this._detachKeys = this.screen.attachKeys(keys => {
      for (const k of keys) this._handleKey(k);
    });

    this._clockInterval = setInterval(() => this._render(), 1000);
    const onResize = () => this._render();
    process.stdout.on('resize', onResize);
    this._render();

    await new Promise(() => {});
  }

  destroy() {
    if (this._clockInterval) clearInterval(this._clockInterval);
    this.spinner.stop();
    if (this._detachKeys) this._detachKeys();
    this.screen.leave();
  }
}
