
import { toast } from "react-toastify";

const defaultOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const showSuccess = (message, options = {}) =>
  toast.success(message, { ...defaultOptions, ...options });

export const showError = (message, options = {}) =>
  toast.error(message, {
    ...defaultOptions,
    autoClose: 4000,
    ...options,
  });

export const showWarning = (message, options = {}) =>
  toast.warning(message, { ...defaultOptions, ...options });

export const showInfo = (message, options = {}) =>
  toast.info(message, { ...defaultOptions, ...options });

export const showLoading = (message = "Please wait...") =>
  toast.loading(message, defaultOptions);

export const updateToast = (toastId, message, type = "success") =>
  toast.update(toastId, {
    render: message,
    type,
    isLoading: false,
    autoClose: 3000,
    closeOnClick: true,
});

export const dismissToast = (toastId) => toast.dismiss(toastId);

export const dismissAllToasts = () => toast.dismiss();

export default toast;
