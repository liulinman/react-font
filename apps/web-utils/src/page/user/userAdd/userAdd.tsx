import { useState } from "react";
import { Modal, Button } from "antd";

const ModalExample = () => {
  const [modalsQueue, setModalsQueue] = useState<number[]>([]); // 队列，用于存储待弹出的模态框
  const [currentModal, setCurrentModal] = useState<null | number>(null); // 当前弹出的modal标识

  // 添加Modal到队列中并依次弹出
  const showModalsInSequence = (modals: number[]) => {
    setModalsQueue(modals);
    setCurrentModal(modals[0]); // 设置第一个Modal为当前弹出的Modal
  };

  // 处理Modal关闭后弹出下一个
  const handleModalClose = () => {
    setCurrentModal(null);
  };

  const handleModalConfirm = () => {
    const nextModalsQueue = [...modalsQueue];
    nextModalsQueue.shift(); // 移除当前弹出的Modal
    if (nextModalsQueue.length > 0) {
      setCurrentModal(nextModalsQueue[0]); // 设置队列中的下一个Modal为当前弹出的Modal
    } else {
      setCurrentModal(null); // 如果没有下一个Modal，关闭当前Modal
    }
    setModalsQueue(nextModalsQueue); // 更新队列状态
  };

  return (
    <div>
      <Button type="primary" onClick={() => showModalsInSequence([2, 1, 3, 4])}>
        显示多个 Modals
      </Button>

      {/* 根据currentModal的值来控制显示哪个Modal */}
      {currentModal === 1 && (
        <Modal
          title="第一个 Modal"
          open={true}
          onOk={handleModalConfirm}
          onCancel={handleModalClose}
        >
          <p>这是第一个 Modal</p>
        </Modal>
      )}

      {currentModal === 2 && (
        <Modal
          title="第二个 Modal"
          open={true}
          onOk={handleModalConfirm}
          onCancel={handleModalClose}
        >
          <p>这是第二个 Modal</p>
        </Modal>
      )}

      {currentModal === 3 && (
        <Modal
          title="第三个 Modal"
          open={true}
          onOk={handleModalConfirm}
          onCancel={handleModalClose}
        >
          <p>这是第三个 Modal</p>
        </Modal>
      )}

      {currentModal === 4 && (
        <Modal
          title="第四个 Modal"
          open={true}
          onOk={handleModalConfirm}
          onCancel={handleModalClose}
        >
          <p>这是第四个 Modal</p>
        </Modal>
      )}
    </div>
  );
};

export default ModalExample;
