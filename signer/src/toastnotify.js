/*!
 * Toastnotify.js  http://pixmawebdesign.com/library/toastnotify/
 * Version - 1.2.1
 * Licensed under the MIT license - http://opensource.org/licenses/MIT
 * Copyright (c) 2019 Leonardo Manuel Alvarez
 */
(function(root, factory) {
  try {
    if (typeof module === "object" && module.exports) {
      module.exports = factory();
    } else {
      root.Toastnotify = factory();
    }
  } catch (error) {
    console.log(
      "La compatibilidad isomórfica no es compatible en este momento."
    );
  }
})(this, function(global) {
  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init);
  }

  Toastnotify = {
    create: () => {
      console.error(
        [
          "DOM no ha terminado de cargar.",
          "\tInvocar el método de creación cuando DOMs readyState está completo"
        ].join("\n")
      );
    }
  };

  let autoincrement = 0;

  function init() {
    const container = document.createElement("div");
    container.id = "toastnotify-container";
    document.body.appendChild(container);

    Toastnotify.create = options => {
      const toast = document.createElement("div");
      toast.id = ++autoincrement;
      toast.id = "toast-" + toast.id;
      if (options.animationIn) {
        toast.className = "toastnotify animated " + options.animationIn;
      } else {
        toast.className = "toastnotify animated fadeInLeft";
      }

      const containertoast = document.createElement("div");
      containertoast.className = "vh";
      toast.appendChild(containertoast);

      //imagen
      if (options.image) {
        const containerimage = document.createElement("span");
        containerimage.className = "b4cimg";
        containertoast.appendChild(containerimage);
        const img = document.createElement("img");
        img.src = options.image;
        img.className = "bAimg";
        containerimage.appendChild(img);
        if (options.important) {
          const important = document.createElement("i");
          important.className = "important";
          containerimage.appendChild(important);
        }
      }

      //add icon
      if (options.icon) {
        const containericono = document.createElement("span");
        containericono.className = "b4cicon";
        containertoast.appendChild(containericono);
        const icono = document.createElement("i");
        icono.className = options.icon;
        containericono.appendChild(icono);
        if (options.important) {
          const importanticon = document.createElement("i");
          importanticon.className = "important";
          containericono.appendChild(importanticon);
        }
      }

      // descripcion texto
      const p = document.createElement("span");
      p.className = "bAq";
      if (options.text) {
        p.innerHTML = options.text;
      } else {
        p.innerHTML = "¡Hola!";
      }
      containertoast.appendChild(p);

      const buttoncontainer = document.createElement("span");
      buttoncontainer.className = "bAo";
      containertoast.appendChild(buttoncontainer);

      //button ok

      if (typeof options.callbackOk === "function") {
        const buttonOK = document.createElement("span");
        if (options.buttonOk) {
          buttonOK.innerHTML = options.buttonOk;
        } else {
          buttonOK.innerHTML = options.okBtnTitle;
        }
        buttonOK.className = "a8k";
        buttoncontainer.appendChild(buttonOK);

        buttonOK.addEventListener("click", event => {
          event.stopPropagation();
          options.callbackOk.call(removeToastnotify());
        });
      }

      //botton cancelar

      if (typeof options.callbackCancel === "function") {
        const buttonCancel = document.createElement("span");
        if (options.buttonCancel) {
          buttonCancel.innerHTML = options.buttonCancel;
        } else {
          buttonCancel.innerHTML = options.cancelBtnTitle;
        }
        buttonCancel.className = "a8k";
        buttoncontainer.appendChild(buttonCancel);

        buttonCancel.addEventListener("click", event => {
          event.stopPropagation();
          options.callbackCancel.call(removeToastnotify());
        });
      }

      //botton cerrar notificacion
      const contenedorClose = document.createElement("div");
      contenedorClose.className = "bBe";
      containertoast.appendChild(contenedorClose);

      const buttonClose = document.createElement("div");
      buttonClose.className = "bBf";
      contenedorClose.appendChild(buttonClose);

      contenedorClose.addEventListener("click", event => {
        event.stopPropagation();
        removeToastnotify();
      });

      toast.hide = () => {
        if (options.animationIn) {
          toast.classList.remove(options.animationIn);
        } else {
          toast.classList.remove("fadeInLeft");
        }

        if (options.animationOut) {
          toast.classList.add(options.animationOut);
        } else {
          toast.classList.add("fadeOutLeft");
        }
        window.setTimeout(() => {
          toast.remove();
        }, 2000);
      };

      // auto close
      if (options.duration) {
        window.setTimeout(toast.hide, options.duration);
      }

      if (options.rounded) {
        toast.className += " rounded";
      }

      if (options.type) {
        toast.className += " toastnotify-" + options.type;
      } else {
        toast.className += " toastnotify-default";
      }

      if (options.classes) {
        toast.className += " " + options.classes;
      }

      const removeToastnotify = () => {
        if (options.animationIn) {
          toast.classList.remove(options.animationIn);
        } else {
          toast.classList.remove("fadeInLeft");
        }

        if (options.animationOut) {
          toast.classList.add(options.animationOut);
        } else {
          toast.classList.add("fadeOutLeft");
        }
        window.setTimeout(
          function() {
            toast.remove();
          }.bind(this),
          300
        );
      };

      document.getElementById("toastnotify-container").appendChild(toast);
      return toast;
    };
  }

  return Toastnotify;
});
