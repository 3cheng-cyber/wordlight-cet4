import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('meaning_check', Path(__file__).resolve().parent.parent/'scripts/check-family-meanings.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class FamilyMeaningTests(unittest.TestCase):
    def test_part_of_speech_is_required_and_verb_labels_are_normalized(self):
        self.assertTrue(checker.has_part_of_speech('n. 选择\\nvt. 选择', 'v'))
        self.assertTrue(checker.has_part_of_speech('adj. 快乐的', 'a'))
        self.assertFalse(checker.has_part_of_speech('a. 乐意的', 'n'))
        self.assertFalse(checker.has_part_of_speech('[机] 起油', 'n'))

    def test_missing_pos_uses_target_sense_not_a_different_pos_gloss(self):
        item = {'word': 'dying', 'pos': 'n.', 'meaning': '垂死的', 'targetSenseIds': ['dying-n']}
        senses = {'dying-n': {'word': 'dying', 'pos': 'n', 'synset': 'ending'}}
        status = checker.reconcile(item, {'translation': 'a. 垂死的'}, senses, {'ending': 'the time when something ends'}, {})
        self.assertEqual(status, 'english-reference')
        self.assertEqual(item['meaning'], checker.MISSING)
        self.assertEqual(item['englishDefinitions'], [{'senseId': 'dying-n', 'definition': 'the time when something ends'}])

    def test_reviewed_correction_is_specific_to_sense_not_homograph(self):
        senses = {'rental': {'word': 'letter', 'pos': 'n', 'synset': 'landlord'}, 'message': {'word': 'letter', 'pos': 'n', 'synset': 'message'}}
        definitions = {'landlord': 'owner who lets another person use something for hire', 'message': 'a written message'}
        corrections = {'rental': {'meaning': '出租人'}}
        rental = {'word': 'letter', 'pos': 'n.', 'meaning': '信；字母', 'targetSenseIds': ['rental']}
        message = {'word': 'letter', 'pos': 'n.', 'meaning': '信；字母', 'targetSenseIds': ['message']}
        row = {'translation': 'n. 信, 字母'}
        self.assertEqual(checker.reconcile(rental, row, senses, definitions, corrections), 'sense-reviewed')
        self.assertEqual(rental['meaning'], '出租人')
        self.assertEqual(checker.reconcile(message, row, senses, definitions, corrections), 'dictionary-pos')
        self.assertEqual(message['meaning'], '信；字母')

    def test_editorial_content_is_preserved_and_wrong_target_identity_rejected(self):
        item = {'word': 'learning', 'pos': 'n.', 'meaning': '学习；学问', 'curated': True}
        self.assertEqual(checker.reconcile(item, {}, {}, {}, {}), 'preserved-editorial')
        self.assertEqual(item['meaning'], '学习；学问')
        wrong = {'word': 'dying', 'pos': 'n.', 'targetSenseIds': ['other']}
        with self.assertRaises(AssertionError):
            checker.reconcile(wrong, {}, {'other': {'word': 'other', 'pos': 'n', 'synset': 'x'}}, {'x': 'other'}, {})


if __name__ == '__main__':
    unittest.main()
