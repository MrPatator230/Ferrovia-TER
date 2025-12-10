"use client";

import React, { forwardRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Shim : certaines versions de react-quill utilisent ReactDOM.findDOMNode qui
// n'est plus fourni/activé avec React 19. On ajoute un fallback sûr côté client.
try {
  // import default react-dom module
  // eslint-disable-next-line no-unused-vars
  const ReactDOM = require('react-dom');
  if (ReactDOM && typeof ReactDOM.findDOMNode !== 'function') {
    ReactDOM.findDOMNode = function findDOMNodeFallback(componentOrElement) {
      if (!componentOrElement) return null;
      // Si c'est déjà un élément DOM
      if (componentOrElement instanceof HTMLElement) return componentOrElement;
      // Si c'est un ref object
      if (componentOrElement.current && componentOrElement.current instanceof HTMLElement) return componentOrElement.current;
      // Si c'est un ReactQuill instance, essayer d'obtenir l'éditeur
      if (typeof componentOrElement.getEditor === 'function') {
        try {
          const editor = componentOrElement.getEditor();
          if (editor && editor.root) return editor.root;
        } catch (e) {
          // ignore
        }
      }
      return null;
    };
  }
} catch (e) {
  // ignore: require may fail server-side or in some bundlers; shim only needed client-side
}

// React-Quill est lourd; on l'importe dynamiquement côté client seulement
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const QuillEditorClient = forwardRef(({ value, onChange }, ref) => {
  return (
    <div>
      <ReactQuill
        ref={ref}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={{
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean']
          ]
        }}
        formats={[
          'header', 'bold', 'italic', 'underline', 'strike',
          'list', 'bullet', 'link', 'image'
        ]}
      />
    </div>
  );
});

export default QuillEditorClient;
