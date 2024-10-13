import PropTypes from 'prop-types';
import { useCallback, useRef, useState, useEffect, forwardRef } from 'react';

import classNames from 'classnames';

import ImmutablePropTypes from 'react-immutable-proptypes';

import Overlay from 'react-overlays/Overlay';
import Textarea from 'react-textarea-autosize';

import AutosuggestAccountContainer from '../features/compose/containers/autosuggest_account_container';

import AutosuggestEmoji from './autosuggest_emoji';
import { AutosuggestHashtag } from './autosuggest_hashtag';

import AutosuggestLatex from './autosuggest_latex';
import AutosuggestUnicodeMath from './autosuggest_unicodemath';

const textAtCursorMatchesToken = (str, caretPosition) => {
  let word;

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

  if (!word || word.trim().length < 3 || ['@', ':', '#'].indexOf(word[0]) === -1) {
    return [null, null];
  }

  word = word.trim().toLowerCase();

  if (word.length > 0) {
    return [left + 1, word];
  } else {
    return [null, null];
  }
};

const AutosuggestTextarea = forwardRef(({
  value,
  suggestions,
  disabled,
  placeholder,
  onSuggestionSelected,
  onSuggestionsClearRequested,
  onSuggestionsFetchRequested,
  onChange,
  onKeyUp,
  onInput,
  onKeyDown,
  onPaste,
  onFocus,
  autoFocus = true,
  lang,
}, textareaRef) => {

  const [suggestionsHidden, setSuggestionsHidden] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const lastTokenRef = useRef(null);
  const tokenStartRef = useRef(0);

  const handleChange = useCallback((e) => {
    const [ tokenStart, token ] = textAtCursorMatchesToken(e.target.value, e.target.selectionStart);

    if (token !== null && lastTokenRef.current !== token) {
      tokenStartRef.current = tokenStart;
      lastTokenRef.current = token;
      setSelectedSuggestion(0);
      onSuggestionsFetchRequested(token);
    } else if (token === null) {
      lastTokenRef.current = null;
      onSuggestionsClearRequested();
    }

    onChange(e);
  }, [onSuggestionsFetchRequested, onSuggestionsClearRequested, onChange, setSelectedSuggestion]);

  const handleKeyDown = useCallback((e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    if (e.which === 229 || e.isComposing) {
      // Ignore key events during text composition
      // e.key may be a name of the physical key even in this case (e.x. Safari / Chrome on Mac)
      return;
    }

    switch(e.key) {
    case 'Escape':
      if (suggestions.size === 0 || suggestionsHidden) {
        document.querySelector('.ui').parentElement.focus();
      } else {
        e.preventDefault();
        setSuggestionsHidden(true);
      }

      break;
    case 'ArrowDown':
      if (suggestions.size > 0 && !suggestionsHidden) {
        e.preventDefault();
        setSelectedSuggestion(Math.min(selectedSuggestion + 1, suggestions.size - 1));
      }

      break;
    case 'ArrowUp':
      if (suggestions.size > 0 && !suggestionsHidden) {
        e.preventDefault();
        setSelectedSuggestion(Math.max(selectedSuggestion - 1, 0));
      }

      break;
    case 'Enter':
    case 'Tab':
      // Select suggestion
      if (lastTokenRef.current !== null && suggestions.size > 0 && !suggestionsHidden) {
        e.preventDefault();
        e.stopPropagation();
        onSuggestionSelected(tokenStartRef.current, lastTokenRef.current, suggestions.get(selectedSuggestion));
      }

      break;
    }

    if (e.defaultPrevented || !onKeyDown) {
      return;
    }

    onKeyDown(e);
  }, [disabled, suggestions, suggestionsHidden, selectedSuggestion, setSelectedSuggestion, setSuggestionsHidden, onSuggestionSelected, onKeyDown]);

  const handleBlur = useCallback(() => {
    setSuggestionsHidden(true);
  }, [setSuggestionsHidden]);

  const handleFocus = useCallback((e) => {
    if (onFocus) {
      onFocus(e);
    }
  }, [onFocus]);

  const handleSuggestionClick = useCallback((e) => {
    const suggestion = suggestions.get(e.currentTarget.getAttribute('data-index'));
    e.preventDefault();
    onSuggestionSelected(tokenStartRef.current, lastTokenRef.current, suggestion);
    textareaRef.current?.focus();
  }, [suggestions, onSuggestionSelected, textareaRef]);

  const handlePaste = useCallback((e) => {
    if (e.clipboardData && e.clipboardData.files.length === 1) {
      onPaste(e.clipboardData.files);
      e.preventDefault();
    }
  }, [onPaste]);

  // Show the suggestions again whenever they change and the textarea is focused
  useEffect(() => {
    if (suggestions.size > 0 && textareaRef.current === document.activeElement) {
      setSuggestionsHidden(false);
    }
  }, [suggestions, textareaRef, setSuggestionsHidden]);

  const renderSuggestion = (suggestion, i) => {
    let inner, key;

    if (suggestion.type === 'emoji') {
      inner = <AutosuggestEmoji emoji={suggestion} />;
      key   = suggestion.id;
    } else if (suggestion.type === 'hashtag') {
      inner = <AutosuggestHashtag tag={suggestion} />;
      key   = suggestion.name;
    } else if (suggestion.type === 'account') {
      inner = <AutosuggestAccountContainer id={suggestion.id} />;
      key   = suggestion.id;
    } else if (suggestion.type === 'latex') {
      inner = <AutosuggestLatex latex={suggestion} />;
      key   = 'latex'+suggestion.expression;
    } else if (suggestion.type === 'unicodemath') {
      inner = <AutosuggestUnicodeMath latex={suggestion} />;
      key   = 'unicodemath'+suggestion.expression;
    }

    return (
      <div role='button' tabIndex={0} key={key} data-index={i} className={classNames('autosuggest-textarea__suggestions__item', { selected: i === selectedSuggestion })} onMouseDown={handleSuggestionClick}>
        {inner}
      </div>
    );
  };

  return (
    <div className='autosuggest-textarea'>
      <Textarea
        ref={textareaRef}
        className='autosuggest-textarea__textarea'
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={onKeyUp}
        onInput={onInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        dir='auto'
        aria-autocomplete='list'
        aria-label={placeholder}
        lang={lang}
      />

      <Overlay show={!(suggestionsHidden || suggestions.isEmpty())} offset={[0, 0]} placement='bottom' target={textareaRef} popperConfig={{ strategy: 'fixed' }}>
        {({ props }) => (
          <div {...props}>
            <div className='autosuggest-textarea__suggestions' style={{ width: textareaRef.current?.clientWidth }}>
              {suggestions.map(renderSuggestion)}
            </div>
          </div>
        )}
      </Overlay>
    </div>
  );
});

AutosuggestTextarea.propTypes = {
  value: PropTypes.string,
  suggestions: ImmutablePropTypes.list,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  onSuggestionSelected: PropTypes.func.isRequired,
  onSuggestionsClearRequested: PropTypes.func.isRequired,
  onSuggestionsFetchRequested: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onKeyUp: PropTypes.func,
  onInput: PropTypes.func,
  onKeyDown: PropTypes.func,
  onPaste: PropTypes.func.isRequired,
  onFocus:PropTypes.func,
  autoFocus: PropTypes.bool,
  lang: PropTypes.string,
};

export default AutosuggestTextarea;
