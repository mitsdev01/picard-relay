import pathlib, sys, unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'host-support'))
from proxy_routes import planned
class ProxyTests(unittest.TestCase):
 def test_exact_and_idempotent(self):
  before='''path / /auth/state /status /jobs /workspace/config /workspace/history /request-catalogue
path /auth/setup /auth/login /auth/logout /workspace/drafts /workspace/approvals /workspace/requests /request-approvals /requests /bridge/v1
path /development/api/missions /development/api/stop /development/worker/register /development/worker/poll /development/worker/result /development/worker/check
path_regexp devmission ^/development/api/missions/[a-f0-9-]{36}$'''
  after=planned(before)
  self.assertEqual(after,planned(after))
  self.assertEqual(after.count('/updates'),2)
  self.assertIn('/development/worker/heartbeat',after)
  self.assertNotIn('/development/api/maintenance',after)
  self.assertNotIn('*',after)
 def test_unknown_layout(self):
  with self.assertRaises(ValueError): planned('other')
