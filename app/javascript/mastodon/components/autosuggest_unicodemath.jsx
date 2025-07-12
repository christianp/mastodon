import React from 'react';
import PropTypes from 'prop-types';
import { tex_to_unicode } from '../features/compose/util/autolatex/autolatex';

export default class AutosuggestUnicodeMath extends React.PureComponent {

  static propTypes = {
    latex: PropTypes.object.isRequired,
  };

  setRef = (c) => {
    this.node = c;
  };

  render () {
    const { latex } = this.props;

    const unicode = tex_to_unicode(latex.expression);

    return (
      <div className='autosuggest-latex' ref={this.setRef}>
        {unicode}
        <br />
        <small>Convert to unicode</small>
      </div>
    );
  }

}
