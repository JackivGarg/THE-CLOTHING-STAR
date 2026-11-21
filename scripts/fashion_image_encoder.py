"""CPU FashionCLIP encoder shared by the benchmark and private image pilot."""

import hashlib
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

MODEL = "vision_model_quantized.onnx"
MODEL_SHA256 = "ffd9b2a43e4221a1252f08bd1ecb327a873f793aa118549c2bc4a8401ba41b48"
MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)


def unit(vector):
    vector = vector.astype(np.float32, copy=False).ravel()
    length = np.linalg.norm(vector)
    if not np.isfinite(length) or length == 0:
        raise ValueError("Invalid retrieval vector")
    return vector / length


class FashionImageEncoder:
    def __init__(self, path: Path):
        if hashlib.sha256(path.read_bytes()).hexdigest() != MODEL_SHA256:
            raise ValueError("Model hash differs from the pinned FashionCLIP release")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        outputs = [out.name for out in self.session.get_outputs() if len(out.shape) == 2 and out.shape[-1] == 512]
        if len(outputs) != 1:
            raise ValueError("Expected one projected 512-dimensional image output")
        self.output_name = outputs[0]

    def encode(self, image: Image.Image):
        rgb = ImageOps.fit(ImageOps.exif_transpose(image).convert("RGB"), (224, 224), Image.Resampling.BICUBIC)
        normalized = (np.asarray(rgb, dtype=np.float32) / 255.0 - MEAN) / STD
        tensor = np.ascontiguousarray(normalized.transpose(2, 0, 1)[None])
        embedded, = self.session.run([self.output_name], {self.input_name: tensor})
        return unit(embedded)
