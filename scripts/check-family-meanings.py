"""Reconcile family glosses against local licensed sources; never guess a POS translation.

Run with --ecdict /path/to/ecdict.csv --wordnet /path/to/english-wordnet-2025.xml.gz.
Does not alter vocabulary, inflections, relations, or learning progress.
"""
import argparse
import collections
import csv
import gzip
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

POS = {'n.': 'n', 'v.': 'v', 'vi.': 'v', 'vt.': 'v', 'a.': 'a', 'adj.': 'a', 'adv.': 'r', 'ad.': 'r'}
MISSING = '该词性中文释义待核对'
# Original concise glosses already reviewed in the first content build.
EDITORIAL = {'affordable', 'adopter', 'adoptee', 'attractiveness', 'closeness', 'correctness',
             'competitiveness', 'confidentiality', 'durability', 'broadband', 'dynamically',
             'deliverable', 'brittleness', 'dampness', 'independently', 'independence',
             'comparability', 'imaginative', 'imagination', 'practicality', 'flexibility', 'sustainability'}


def has_part_of_speech(translation, pos):
    for line in translation.replace('\\n', '\n').splitlines():
        match = re.match(r'^\s*((?:adj|adv|vi|vt|ad|[anvr])\.)\s*(.*)', line)
        if match and POS.get(match.group(1)) == pos and match.group(2).strip():
            return True
    return False


def reconcile(entry, row, senses, definitions, corrections):
    if entry.get('curated') or entry['word'] in EDITORIAL:
        return 'preserved-editorial'
    ids = entry.get('targetSenseIds', [])
    # Match exact dictionary senses; homographs must not share a blanket correction.
    corrected = bool(ids) and all(sid in corrections for sid in ids)
    matched = has_part_of_speech(row.get('translation', ''), POS[entry['pos']])
    if not corrected and matched:
        return 'dictionary-pos'
    references = []
    seen = set()
    for sid in ids:
        sense = senses[sid]
        assert sense['word'] == entry['word'] and sense['pos'] == POS[entry['pos']], sid
        definition = definitions[sense['synset']]
        if definition not in seen:
            references.append({'senseId': sid, 'definition': definition})
            seen.add(definition)
    assert references, f"Missing source definition for {entry['word']}"
    entry['englishDefinitions'] = references
    if corrected:
        entry['meaning'] = '；'.join(dict.fromkeys(corrections[sid]['meaning'] for sid in ids))
        entry['meaningStatus'] = 'sense-reviewed'
        return 'sense-reviewed'
    entry['meaning'] = MISSING
    entry['meaningStatus'] = 'english-reference'
    return 'english-reference'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ecdict', required=True, type=Path)
    parser.add_argument('--wordnet', required=True, type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    metadata_path = root/'public/family-sources.json'
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    expected = {source['id']: source.get('sha256') for source in metadata['sources']}
    for source_id, source_path in [('ecdict', args.ecdict), ('oewn-2025', args.wordnet)]:
        assert hashlib.sha256(source_path.read_bytes()).hexdigest() == expected[source_id], 'Use the recorded dictionary version'
    rows = {}
    with args.ecdict.open(encoding='utf-8', newline='') as source:
        for row in csv.DictReader(source):
            word = row['word'].lower()
            if word not in rows or row['word'] == word:
                rows[word] = row
    lexicon = ET.parse(gzip.open(args.wordnet)).getroot().find('Lexicon')
    definitions = {s.get('id'): s.findtext('Definition') for s in lexicon.findall('Synset')}
    senses = {}
    for item in lexicon.findall('LexicalEntry'):
        lemma = item.find('Lemma')
        for sense in item.findall('Sense'):
            senses[sense.get('id')] = {'word': lemma.get('writtenForm').lower(), 'pos': lemma.get('partOfSpeech').replace('s', 'a'), 'synset': sense.get('synset')}
    corrections = json.loads((root/'scripts/family-meaning-corrections.json').read_text(encoding='utf-8'))
    # Keep the checked English evidence beside each original Chinese correction.
    for sid, correction in corrections.items():
        assert definitions[senses[sid]['synset']] == correction['definition'], sid
    path = root/'public/word-families.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    counts = collections.Counter()
    for family in data['index'].values():
        for entry in family['derivatives']:
            counts[reconcile(entry, rows.get(entry['word'], {}), senses, definitions, corrections)] += 1
    coverage = data['coverage']
    coverage['missingChineseEntries'] = counts['english-reference']
    coverage['senseReviewedEntries'] = counts['sense-reviewed']
    coverage['meaningAudit'] = dict(counts)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    metadata['coverage'] = coverage
    metadata['meaningAudit'] = {
        'date': '2026-10-03', 'counts': dict(counts),
        'method': '保留已有人工词族；其余中文必须有匹配词性。缺少可靠对应时不套用其他词性的释义，展示目标义项的 OEWN 英文定义。少量常见易混词依据确切目标义项人工修订。',
        'limitation': '匹配词性不等于所有中文已逐义项人工核对。本轮修正词性回退和指定常见义项，未声称完成全库语义审校。',
        'corrections': corrections
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'relations': sum(counts.values()), 'meaningAudit': dict(counts)}))


if __name__ == '__main__':
    main()
