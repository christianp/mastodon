import { connect } from 'react-redux';

import { openModal, closeModal } from '../../../actions/modal';
import { isUserTouching } from '../../../is_mobile';
import LaTeXDropdown from '../components/latex_dropdown';

const mapStateToProps = state => ({
  value: state.getIn(['compose', 'startlatex']),
});

const mapDispatchToProps = (dispatch, { onPickLaTeX }) => ({

  onChange (value) {
    onPickLaTeX(value);
  },

  isUserTouching,
  onModalOpen: props => dispatch(openModal('ACTIONS', props)),
  onModalClose: () => dispatch(closeModal()),

});

export default connect(mapStateToProps, mapDispatchToProps)(LaTeXDropdown);
