import os, pathlib, tempfile, unittest
import subprocess
from unittest.mock import patch
from reconcile import route_plan, missing_files, companion_require_idle
import reconcile as recovery

class RecoveryTests(unittest.TestCase):
    site = 'picard-relay.example.test'
    core = site + ' {\n    @read {\n    }\n}\n'
    snippet = '    @developmentRead {\n        path /development/\n    }\n'
    def test_restore_and_idempotence(self):
        restored = route_plan(self.core, self.snippet, self.site)
        self.assertEqual(restored, route_plan(restored, self.snippet, self.site))
        self.assertIn('    @read {', restored)
    def test_unknown_route_refused(self):
        with self.assertRaises(ValueError):
            route_plan(self.core + '/development/other', self.snippet, self.site)
    def test_unknown_layout_refused(self):
        with self.assertRaises(ValueError):
            route_plan(self.core.replace('@read', '@new'), self.snippet, self.site)
    def test_missing_only_and_changed_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            base = pathlib.Path(folder)
            snap, live = base/'snapshot', base/'live'
            snap.mkdir(); live.mkdir()
            (snap/'agent.mjs').write_text('known')
            self.assertEqual(len(missing_files(snap, live)), 1)
            (live/'agent.mjs').write_text('known')
            self.assertEqual(missing_files(snap, live), [])
            (live/'agent.mjs').write_text('changed')
            with self.assertRaises(ValueError): missing_files(snap, live)
    def test_host_command_works_on_host_python(self):
        from reconcile import run
        self.assertEqual(run('/usr/bin/true').returncode, 0)
    def test_idle_probe_falls_back_to_control_without_upgrade_check(self):
        with tempfile.TemporaryDirectory() as folder:
            live = pathlib.Path(folder)
            live.mkdir()
            (live / 'control.mjs').write_text('control')
            status = '{"missions":[{"state":"completed"}]}'
            def fake_run(*args, **kwargs):
                if args[0] == 'runuser':
                    return subprocess.CompletedProcess(args, 0, status, '')
                return subprocess.CompletedProcess(args, 0, '', '')
            with patch.object(recovery, 'LIVE', live), patch.object(recovery, 'run', fake_run):
                self.assertTrue(companion_require_idle())
            busy = '{"missions":[{"state":"running"}]}'
            def busy_run(*args, **kwargs):
                if args[0] == 'runuser':
                    return subprocess.CompletedProcess(args, 0, busy, '')
                return subprocess.CompletedProcess(args, 0, '', '')
            with patch.object(recovery, 'LIVE', live), patch.object(recovery, 'run', busy_run):
                self.assertFalse(companion_require_idle())
    def test_symlink_target_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            base = pathlib.Path(folder)
            snap, live = base/'snapshot', base/'live'
            snap.mkdir(); live.mkdir()
            (snap/'agent.mjs').write_text('known')
            (live/'agent.mjs').symlink_to(snap/'agent.mjs')
            with self.assertRaises(ValueError): missing_files(snap, live)
    def test_full_restore_keeps_state_then_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            base, live, unit, caddy = root/'backup', root/'live', root/'unit', root/'Caddyfile'
            (base/'source').mkdir(parents=True)
            (base/'source'/'server.mjs').write_text('known-good')
            (base/'agent.service').write_text('unit')
            (base/'routes.txt').write_text(self.snippet)
            caddy.write_text(self.core)
            state = root/'state.sqlite'; state.write_bytes(b'never change mission history')
            commands = []
            def fake_run(*args, **kwargs):
                commands.append(args)
                return subprocess.CompletedProcess(args, 1 if 'is-active' in args else 0, '', '')
            with patch.dict(os.environ, {'PICARD_FLOCKBAY_CADDY_SITE': self.site}), patch.multiple(recovery, BASE=base, LIVE=live, UNIT=unit, CADDY=caddy, PERSISTENT=[str(state)]), patch.object(recovery, 'run', fake_run):
                result = recovery.reconcile()
                self.assertEqual(result['restoredFiles'], 1)
                self.assertTrue(result['restoredRoutes'])
                self.assertTrue(result['restoredUnit'])
                self.assertEqual(state.read_bytes(), b'never change mission history')
                self.assertEqual(live.stat().st_mode & 0o777, 0o755)
                again = recovery.reconcile()
                self.assertEqual(again['restoredFiles'], 0)
                self.assertFalse(again['restoredRoutes'])
                # A running but unreadable or busy companion stops before any repair.
                caddy.write_text(self.core)
                def busy(*args, **kwargs):
                    return subprocess.CompletedProcess(args, 1 if args[0]=='runuser' else 0, '', '')
                with patch.object(recovery, 'run', busy):
                    with self.assertRaisesRegex(ValueError, 'deferred'): recovery.reconcile()
                self.assertEqual(caddy.read_text(), self.core)

if __name__ == '__main__': unittest.main()
