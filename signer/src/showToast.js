export default function showToast(text, okTitle, cancelTitle, okCb, cancelCb) {
  Toastnotify.create({
    text,
    okBtnTitle: okTitle,
    cancelBtnTitle: cancelTitle,
    type: "dark",
    important: true,
    callbackOk: okCb,
    callbackCancel: cancelCb
  });
}
