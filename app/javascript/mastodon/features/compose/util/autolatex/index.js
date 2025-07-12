/* eslint-disable */
import {tex_to_unicode, macros} from './autolatex.js';

window.macros = macros;
window.tex_to_unicode = tex_to_unicode;

const inp = document.getElementById('expr');
const output = document.getElementById('output');

function go() {
    const expr = inp.value;
    const rep = tex_to_unicode(expr);
    if(rep!==null) {
        output.textContent = rep;
    } else {
        output.textContent = 'NOPE';
    }
}

inp.addEventListener('keyup',go);
go();
