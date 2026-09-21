# UnixGreybeard.Org Articles

Private publication content for the UnixGreybeard.Org website. The repository
contains the categorized Markdown article tree and the interim raw Google
Takeout archive under `raw-takeout/`, tracked with Git LFS.

This repository is consumed as the `content/articles/` submodule by the parent
[UnixGreybeard.Org](https://github.com/averyfreeman/UnixGreybeard.Org)
website repository. Its content is produced and validated by the public
[Airflow-AI_Search-to-Blog-Article-Pipeline](https://github.com/averyfreeman/Airflow-AI_Search-to-Blog-Article-Pipeline)
repository.

Keep this repository private. Install Git LFS before cloning or pulling the raw
archive:

```sh
git lfs install
git lfs pull
```

The raw LFS copy is temporary. The planned backup procedure will move durable
raw data and pipeline artifacts into encrypted external snapshots with
checksums, retention, and restore verification.
