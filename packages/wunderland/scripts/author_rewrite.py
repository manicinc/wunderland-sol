# Rewrite commits authored/committed by "Framers <team@frame.dev>" to Johnny Dunn
# Used with: git filter-repo --force --commit-callback "exec(open('scripts/author_rewrite.py','rb').read())"
target_name = b"Framers"
target_email = b"team@frame.dev"
new_name = b"Johnny Dunn"
new_email = b"johnnyfived@protonmail.com"

if commit.author_name == target_name or commit.author_email == target_email:
    commit.author_name = new_name
    commit.author_email = new_email
if commit.committer_name == target_name or commit.committer_email == target_email:
    commit.committer_name = new_name
    commit.committer_email = new_email


