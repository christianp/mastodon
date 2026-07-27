import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import { defineMessages } from 'react-intl';
import { injectIntl } from '@/mastodon/components/intl';

import classNames from 'classnames';

import LatexIcon from '@/material-icons/400-20px/latex.svg?react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { IconButton } from 'mastodon/components/icon_button';

import { supportsPassiveEvents } from 'detect-passive-events';
import Overlay from 'react-overlays/Overlay';

import InlineIcon from '@/latex-icons/inline-mode.svg?react';
import DisplayIcon from '@/latex-icons/display-mode.svg?react';
import { Icon } from 'mastodon/components/icon';

import { assetHost } from 'mastodon/utils/config';

const messages = defineMessages({
  inline_short:  { id: 'latex.inline.short', defaultMessage: 'Inline' },
  inline_long:   { id: 'latex.inline.long', defaultMessage: 'Notation that sits inline with other text' },
  display_short: { id: 'latex.display.short', defaultMessage: 'Display-mode' },
  display_long:  { id: 'latex.display.long', defaultMessage: 'Notation that sits on its own line' },
  start_latex:  { id: 'latex.start', defaultMessage: 'Start writing LaTeX' },
});

const listenerOptions = supportsPassiveEvents ? { passive: true, capture: true } : true;

class LaTeXDropdownMenuImpl extends PureComponent {
  static propTypes = {
    style: PropTypes.object,
    onPick: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    pickerButtonRef: PropTypes.object.isRequired,
  };

  static defaultProps = {
    style: {},
  };

  state = {
    readyToFocus: false,
  };

  handleDocumentClick = e => {
    if (this.node && !this.node.contains(e.target) && !this.props.pickerButtonRef.contains(e.target)) {
      this.props.onClose();
    }
  };

  componentDidMount () {
    document.addEventListener('click', this.handleDocumentClick, { capture: true });
    document.addEventListener('touchend', this.handleDocumentClick, listenerOptions);

    requestAnimationFrame(() => {
      this.setState({ readyToFocus: true });
      if (this.node) {
        const element = this.node.querySelector('.latex-dropdown__option');
        if (element) element.focus();
      }
    });
  }

  componentWillUnmount () {
    document.removeEventListener('click', this.handleDocumentClick, { capture: true });
    document.removeEventListener('touchend', this.handleDocumentClick, listenerOptions);
  }

  setRef = c => {
    this.node = c;
  };

  getI18n = () => {
    const { intl } = this.props;

    return {
      inline_short: intl.formatMessage(messages.inline_short),
      inline_long: intl.formatMessage(messages.inline_long),
      display_short: intl.formatMessage(messages.display_short),
      display_long: intl.formatMessage(messages.display_long),
      start_latex: intl.formatMessage(messages.start_latex),
    };
  };

  handleClick = (delimiter, event) => {
    if (!(event.ctrlKey || event.metaKey)) {
      this.props.onClose();
    }
    this.props.onPick(delimiter);
  };

  handleKeyDown = (e, delimiter) => {
    if(e.key == 'Enter') {
      this.props.onPick(delimiter);
    }
  };


  render () {
    const { intl, style, button, onPick } = this.props;

    const items = [
      { icon: InlineIcon, value: 'inline', text: intl.formatMessage(messages.inline_short), meta: intl.formatMessage(messages.inline_long) },
      { icon: DisplayIcon, value: 'display', text: intl.formatMessage(messages.display_short), meta: intl.formatMessage(messages.display_long) },
    ];

    return (
      <div className={`latex-dropdown__menu`} style={style} ref={this.setRef}>
        {items.map(item => (
          <div role='option' tabIndex='0' key={item.value} data-index={item.value} onKeyDown={(e) => {this.handleKeyDown(e,item.value)}} onClick={(e) => {this.handleClick(item.value, e)}} className={'latex-dropdown__option'}>
            <div className='latex-dropdown__option__icon'>
              <Icon icon={item.icon} />
            </div>

            <div className='latex-dropdown__option__content'>
              <strong>{item.text}</strong>
              {item.meta}
            </div>
          </div>
        ))}
      </div>
    );
  }

}

const LaTeXDropdownMenu = injectIntl(LaTeXDropdownMenuImpl);

class LaTeXDropdown extends PureComponent {

  static propTypes = {
    onPickLaTeX: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    button: PropTypes.node,
  };

  state = {
    active: false,
    placement: 'bottom',
  };

  setRef = (c) => {
    this.dropdown = c;
  };

  onShowDropdown = () => {
    this.setState({ active: true });
  };

  onHideDropdown = () => {
    this.setState({ active: false });
  };

  onToggle = (e) => {
    if (!e.key || e.key === 'Enter') {
      if (this.state.active) {
        this.onHideDropdown();
      } else {
        this.onShowDropdown(e);
      }
    }
  };

  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.onHideDropdown();
    }
  };

  setTargetRef = c => {
    this.target = c;
  };

  findTarget = () => {
    return this.target;
  };

  render () {
    const { container, intl, button, onPickLaTeX } = this.props;
    const { active, placement } = this.state;

    const title = intl.formatMessage(messages.start_latex);

    return (
      <div className='latex-dropdown__dropdown' onKeyDown={this.handleKeyDown} ref={this.setTargetRef}>
        <IconButton
          title={title}
          aria-expanded={active}
          active={active}
          iconComponent={LatexIcon}
          onClick={this.onToggle}
          id="latex"
          inverted
        />

        <Overlay show={active} placement={placement} flip target={this.findTarget} popperConfig={{ strategy: 'fixed', onFirstUpdate: this.handleOverlayEnter }}>
          {({ props, placement })=> (
            <div {...props} style={{ ...props.style }}>
              <div className={`dropdown-animation ${placement}`}>
                <LaTeXDropdownMenu
                  onClose={this.onHideDropdown}
                  onPick={onPickLaTeX}
                  pickerButtonRef={this.target}
                />
              </div>
            </div>
          )}
        </Overlay>
      </div>
    );
  }

}

export default injectIntl(LaTeXDropdown);
