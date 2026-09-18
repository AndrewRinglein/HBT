"""New aliases bind published shared files; existing-row refresh stays explicit."""
def shared_files_for_new_mapping(tid, previous, definitions):
    if not tid or tid in previous['artmap']:
        return set()
    current = definitions[tid]
    reused = set()
    for field, source, suffix in [('token', 'src', ''), ('card', 'cardsrc', '.jpg')]:
        if not current.get(field):
            continue
        filename = current[field] + suffix
        owners = [owner for owner, row in previous['artmap'].items() if row.get(field) == filename]
        if not owners:
            continue
        if filename not in previous['files']:
            raise ValueError('shared art missing from manifest: ' + filename)
        for owner in owners:
            prior = definitions.get(owner, {})
            if prior.get(field) != current[field] or prior.get(source) != current.get(source) or not current.get(source):
                raise ValueError('conflicting shared art source: ' + filename + ' / ' + owner)
        reused.add(filename)
    return reused
