#!/usr/bin/env python3
"""Merge only the managed docs locations; never replace production server blocks."""
import argparse
from pathlib import Path
import re
import tempfile
import os

BEGIN = '# BEGIN ENGLISH WORLD DOCS'
END = '# END ENGLISH WORLD DOCS'
ANCHOR = re.compile(r'(?m)^(?P<indent>[ \t]*)location\s*=\s*/englishWorld/admin\s*\{')

def block(indent):
    lines = [BEGIN, 'location = /docs {', '    return 308 /docs/;', '}', '',
             'location ^~ /docs/ {', '    try_files $uri $uri.html $uri/ =404;',
             '    error_page 404 /docs/404.html;', '}', END]
    return '\n'.join(indent + line if line else '' for line in lines) + '\n\n'

def merge(source):
    # Conservative recognition: ambiguity must be reviewed, never guessed.
    if source.count(BEGIN) != source.count(END) or source.count(BEGIN) > 1:
        raise ValueError('Malformed or duplicate docs markers')
    if BEGIN in source:
        managed = re.compile(r'(?m)^[ \t]*' + re.escape(BEGIN) + r'\n[\s\S]*?^[ \t]*' + re.escape(END) + r'\n(?:\n)?')
        source, count = managed.subn('', source)
        if count != 1:
            raise ValueError('Malformed docs marker lines')
    anchors = list(ANCHOR.finditer(source))
    if len(anchors) != 1 or not re.search(r'(?m)^\s*root\s+/usr/share/nginx/html\s*;', source):
        raise ValueError('Unknown nginx layout: expected one admin anchor and known static root')
    # Existing unmanaged rules could shadow this addition, so refuse them.
    if re.search(r'(?m)^\s*location\b[^\n{]*?/docs\b', source):
        raise ValueError('Unmanaged docs location exists')
    anchor = anchors[0]
    # The anchor must belong directly to a server with the expected root.
    stack = []
    enclosing = None
    token_pattern = r""""(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|[{}]"""
    for token in re.finditer(token_pattern, source):
        if token.start() >= anchor.start():
            break
        if token.group() == '{':
            stack.append(token.start())
        elif token.group() == '}':
            if not stack:
                raise ValueError('Unbalanced nginx configuration')
            stack.pop()
    if stack:
        opening = stack[-1]
        if re.search(r'\bserver\s*$', source[:opening]):
            enclosing = source[opening + 1:anchor.start()]
    if enclosing is None or not re.search(r'(?m)^\s*root\s+/usr/share/nginx/html\s*;', enclosing):
        raise ValueError('Admin anchor is not in a recognized static server')
    return source[:anchor.start()] + block(anchor['indent']) + source[anchor.start():]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('config', type=Path)
    parser.add_argument('--output', type=Path, help='Write a candidate instead of editing the input')
    args = parser.parse_args()
    result = merge(args.config.read_text())
    destination = args.output or args.config
    # Same-directory atomic replacement avoids partially written live configuration.
    fd, name = tempfile.mkstemp(prefix='.docs-nginx-', dir=destination.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(result)
        os.chmod(name, 0o644)
        os.replace(name, destination)
    finally:
        if os.path.exists(name):
            os.unlink(name)

if __name__ == '__main__':
    main()
