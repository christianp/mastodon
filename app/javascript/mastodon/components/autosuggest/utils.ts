import { WORD } from '../../utils/hashtags';

export const textAtCursorMatchesToken = (
  str: string,
  caretPosition: number,
  searchTokens: string[],
) => {
  let word: string;

  const regex = new RegExp(
    `[${searchTokens.join('')}${WORD}+-]+(\\s[\\p{Script=Latin}\\p{Script=Cyrillic}\\p{M}]+)?$`,
    'iu',
  );
  const left = str.slice(0, caretPosition).search(regex);
  const right = str.slice(caretPosition).search(/\s/);

  if (right < 0) {
    word = str.slice(left);
  } else {
    word = str.slice(left, right + caretPosition);
  }

  word = word.trim();

  if (word.length < 3 || (word[0] && !searchTokens.includes(word[0]))) {
    return [null, null] as const;
  }

  if (word.length > 0) {
    return [left + 1, word] as const;
  } else {
    return [null, null] as const;
  }
};


export const textAtCursorMatchesTokenLaTeX = (
  str: string,
  caretPosition: number,
  searchTokens: string[],
) => {
  let word: string;

  let left;
  let right;

  /* If the caret is inside a LaTeX expression, this matches a latex token.
   * First: try to track leftwards from the caret position to an opening delimiter, without seeing a closing delimiter first.
   */
  const re_latex = /\\[\(\[](?:(?!\\[\)\]])(?:.|\n))*(?!\n)$/m;
  left = str.slice(0, caretPosition).search(re_latex);
  if (left >= 0) {

    /* Next: Try to find the end of the expression - either a closing or ending delimiter or something that looks like a word.
     *
     * Examples: (Caret position marked with the character |)
     *
     * Starting delimiter:  \( x| \(y\)         This looks like two separate expressions, and the user hasn't typed the closing delimiter of the leftmost one yet.
     * Closing delimier:    \( x| \)            The user is editing a correctly delimited expression.
     * Wordlike:            \( x| belongs to    The user is adding a LaTeX expression inside a passage of prose.
     */
    let remainder = str.slice(caretPosition);
    const next_start_delimiter = remainder.search(/\\[\(\[]/);
    let end = str.length;

    /* If a starting delimiter is found, then we shouldn't go beyond that, but there might be a closing delimiter or a word before it. */
    if(next_start_delimiter >= 0) {
      remainder = remainder.slice(0, next_start_delimiter);
      end = caretPosition + next_start_delimiter;
    }
    const next_end_delimiter = remainder.search(/\\[\)\]]/);
    const next_wordlike = remainder.search(/\s(?:[\p{Ll}\p{Lu}\p{Lo}\p{Lt}]{2,})/u);
    right = next_end_delimiter>=0 ? next_end_delimiter : next_wordlike;
    if (right < 0) {
      /* If no closing delimiter or word was found, assume the whole string from the starting delimiter to the end is LaTeX. */
      word = str.slice(left, end);
    } else {
      if(str.slice(caretPosition + right).match(/^\s/)) {
        /* If there is a word after the expression, don't include it. */
        word = str.slice(left, right + caretPosition);
      } else {
        /* Otherwise, there is a closing delimiter, so include it. */
        word = str.slice(left, right + caretPosition + 2);
      }
    }
    /* Don't match when there's just an opening delimiter and no other non-whitespace characters. */
    if (word.trim().length >= 3) {
      return [left + 1, word];
    }
  }

  /* If no LaTeX match was found, look for the other token types: mention, emoji, hashtag. */
  left  = str.slice(0, caretPosition).search(/\S+$/);
  right = str.slice(caretPosition).search(/\s/);

  if (right < 0) {
    word = str.slice(left);
  } else {
    word = str.slice(left, right + caretPosition);
  }

  word = word.trim();

  if (word.length < 3 || (word[0] && !searchTokens.includes(word[0]))) {
    return [null, null];
  }

  if (word.length > 0) {
    return [left + 1, word];
  } else {
    return [null, null];
  }
};

