
import { useModal } from "../context/Modal";
import './OpenModalButton.css';

function OpenModalButton({
  modalComponent,
  buttonText,
  onButtonClick,
  onModalClose,
  className,
  disabled
}) {
  const { setModalContent, setOnModalClose } = useModal();

  const handleClick = (e) => {
    e.stopPropagation(); 
    if (onModalClose) setOnModalClose(onModalClose);
    setModalContent(modalComponent);
    if (typeof onButtonClick === "function") onButtonClick();
  };


  const combinedClassName = `modal-button ${className || ''}`.trim();

  return (
    <button className={combinedClassName}
    onClick={handleClick}
    disabled={disabled}>
      {buttonText}
    </button>
  );
}

export default OpenModalButton;
