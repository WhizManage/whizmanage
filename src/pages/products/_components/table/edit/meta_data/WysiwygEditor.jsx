// import { useState } from "react";
// import { EditorState, convertToRaw, ContentState } from "draft-js";
// import { Editor } from "react-draft-wysiwyg";
// import { __ } from '@wordpress/i18n';

// import {
//   Modal,
//   ModalBody,
//   ModalContent,
//   ModalFooter,
//   ModalHeader,
//   useDisclosure,
// } from "@heroui/react";
// import { Button } from "@components/ui/button";
// import { Edit } from "lucide-react";
// import {
//   handleUploadPhotoEditor,
//   inlineOptions,
//   listOptions,
//   newOptions,
//   TextColor,
// } from "../editor/toolsEditor";
// import htmlToDraft from "html-to-draftjs";
// import draftToHtml from "draftjs-to-html";
// const WysiwygEditor = ({ item, handleInputChange, isColumns, title, row }) => {
//   const { isOpen, onOpen, onOpenChange } = useDisclosure();
//    
//   const [editorState, setEditorState] = useState(() => {
//     const contentBlock = htmlToDraft(item.value);
//     if (contentBlock) {
//       const contentState = ContentState.createFromBlockArray(
//         contentBlock.contentBlocks
//       );
//       return EditorState.createWithContent(contentState);
//     }
//     return EditorState.createEmpty();
//   });
//   const onEditorStateChange = (state) => {
//     setEditorState(state);

//     const html = draftToHtml(convertToRaw(state.getCurrentContent()));
//     // שליחת ה-HTML כערך
//     handleInputChange(item.key, html);
//   };

//   const onSave = () => {
//     // const htmlContent = draftToHtml(convertToRaw(editorState.getCurrentContent()));
//     // handleInputChange(item.key, htmlContent);
//   };

//   return (
//     <>
//       {!isColumns ? (
//         <div className="relative h-fit border rounded-lg flex gap-1 items-center dark:bg-slate-700">
//           <Editor
//             editorState={editorState}
//             wrapperClassName="demo-editor"
//             editorClassName="demo-editor px-2"
//             onEditorStateChange={onEditorStateChange}
//             placeholder={__(`Type a ${name} here.`)}
//             toolbar={{
//               options: newOptions,
//               inline: { options: inlineOptions },
//               list: { options: listOptions },
//               textAlign: { inDropdown: true },
//               colorPicker: { colors: TextColor },
//               image: {
//                 uploadCallback: handleUploadPhotoEditor,
//                 previewImage: true,
//               },
//             }}
//           />
//         </div>
//       ) : (
//         <>
//           <Button
//             onClick={onOpen}
//             variant="outline"
//             className="flex gap-2 h-8 capitalize"
//           // title={}
//           >
//             {__("Edit")}
//             <Edit className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
//           </Button>
//           <Modal
//             size="2xl"
//             backdrop="opaque"
//             isOpen={isOpen}
//             onOpenChange={onOpenChange}
//             scrollBehavior="inside"
//             classNames={{
//               backdrop:
//                 "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
//             }}
//           >
//             <ModalContent className="dark:bg-slate-800">
//               {(onClose) => (
//                 <>
//                   <ModalHeader className="flex flex-col gap-1 text-3xl">
//                     {__("Edit")}
//                   </ModalHeader>
//                   <ModalBody>
//                     <div className="relative h-fit border dark:border-slate-700 rounded-lg flex gap-1 items-center dark:bg-slate-800">
//                       <Editor
//                         editorState={editorState}
//                         wrapperClassName="demo-editor"
//                         editorClassName="demo-editor px-2"
//                         onEditorStateChange={onEditorStateChange}
//                         placeholder={__(`Type here.`)}
//                         toolbar={{
//                           options: newOptions,
//                           inline: { options: inlineOptions },
//                           list: { options: listOptions },
//                           textAlign: { inDropdown: true },
//                           colorPicker: { colors: TextColor },
//                           image: {
//                             uploadCallback: handleUploadPhotoEditor,
//                             previewImage: true,
//                           },
//                         }}
//                       />
//                     </div>
//                   </ModalBody>
//                   <ModalFooter>
//                     <Button onClick={onClose} variant="outline">
//                       {__("Close")}
//                     </Button>
//                     <Button
//                       onClick={() => {
//                         onSave();
//                         onClose();
//                       }}
//                     >
//                       {__("Save")}
//                     </Button>
//                   </ModalFooter>
//                 </>
//               )}
//             </ModalContent>
//           </Modal>
//         </>
//       )}
//     </>
//   );
// };

// export default WysiwygEditor;
// src/components/RichEditor/RichEditorModal.jsx
import React, { useRef, useState, useEffect } from "react";
import { __ } from '@wordpress/i18n';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { Button } from "@components/ui/button";
import { Edit } from "lucide-react";
import HtmlEditor from "../../../../../../layout/editor/HtmlEditor";

const convertRGBToHex = (html) => {
  return html.replace(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
    (match, r, g, b) => {
      const hex = [r, g, b]
        .map((x) => {
          const hexPart = parseInt(x, 10).toString(16);
          return hexPart.length === 1 ? "0" + hexPart : hexPart;
        })
        .join("");
      return "#" + hex;
    }
  );
};
const WysiwygEditor = ({ item, handleInputChange, isColumns }) => {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
   
  const modalContentRef = useRef(null);

  // Track content changes
  const [content, setContent] = useState(item.value || "");
  const [initialContent, setInitialContent] = useState(item.value || "");
  const [isDirty, setIsDirty] = useState(false);

  // Update isDirty when content changes
  useEffect(() => {
    setIsDirty(content !== initialContent);
    if(!isColumns){
      handleInputChange(item.key, content);
    }
  }, [content, initialContent]);
  useEffect(() => {
  
    if(!isColumns){
      setContent(item.value || "");
      setInitialContent(item.value || "");
      setIsDirty(false);
    }
  }, [item.value]);
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent(item.value || "");
      setInitialContent(item.value || "");
      setIsDirty(false);
    }
  }, [isOpen, item.value]);

  // Handle content update from editor
  const handleContentUpdate = (newContent) => {
    setContent(newContent);
  };

  // Save changes
  const handleSave = () => {
    if (item.value && isDirty) {
      handleInputChange(item.key, content);
      setInitialContent(content); // Reset initial content to match current
      setIsDirty(false);
      onClose();
    }
  };
  useEffect(() => {
    if (content && content.includes("rgb(")) {
      const newContent = convertRGBToHex(content);
      if (newContent !== content) {
        setContent(newContent);
      }
    }
  }, [content]);
  return (
    <>
      {!isColumns ? (
       <div className="relative h-fit border rounded-lg flex gap-1 items-center dark:bg-slate-700">
          <HtmlEditor
            key={initialContent} // זה מכריח רינדור מחדש כשהתוכן משתנה
            initialContent={content}
            onSave={handleContentUpdate}
            height="full"
          />
        </div>
      ) : (
        <>
          <Button
            onClick={onOpen}
            variant="outline"
            className="flex gap-2 h-8 capitalize"
          >
            {__("Edit", "whizmanage")}
            <Edit className="ml-2 rtl:mr-2 rtl:ml-0 h-4 w-4 shrink-0 opacity-50" />
          </Button>

          <Modal
            size="5xl"
            backdrop="opaque"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            isDismissable={false}
            classNames={{
              backdrop:
                "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
              body: "p-0",
              header: "border-b dark:border-slate-700",
              footer: "border-t dark:border-slate-700",
              wrapper: "modal-wrapper",
              closeButton: "right-2 top-2 z-50",
            }}
          >
            <ModalContent
              ref={modalContentRef}
              className="dark:bg-slate-800 h-[90vh] overflow-hidden flex flex-col modal-content-wrapper"
            >
              {(onCloseFunc) => (
                <>
                  {/* Header */}
                  <ModalHeader className="flex flex-col gap-1 py-4">
                    <h2 className="text-2xl text-center dark:text-slate-200 font-semibold">
                      {__("Edit", "whizmanage")}
                    </h2>
                  </ModalHeader>

                  {/* Body */}
                  <ModalBody className="overflow-auto flex-1">
                    <HtmlEditor
                      initialContent={content}
                      onSave={handleContentUpdate}
                      height="full"
                    />
                  </ModalBody>

                  {/* Footer */}
                  <ModalFooter className="border-t dark:border-slate-700">
                    <Button onClick={onCloseFunc} variant="outline">
                      {__("Close", "whizmanage")}
                    </Button>
                    <Button onClick={handleSave} disabled={!isDirty}>
                      {__("Save", "whizmanage")}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
};

export default WysiwygEditor;
