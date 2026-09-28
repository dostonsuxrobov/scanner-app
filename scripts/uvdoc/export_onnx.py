"""Converts the UVDoc page-unwarping network to the ONNX file the app loads.

UVDoc: Neural Grid-based Document Unwarping (Verhoeven et al., SIGGRAPH Asia
2023), https://github.com/tanguymagne/UVDoc — MIT license.

Usage (with torch, onnx, onnxruntime installed):
    git clone https://github.com/tanguymagne/UVDoc
    python scripts/uvdoc/export_onnx.py UVDoc public/models/uvdoc-v1.onnx

The exported model takes a 1×3×712×488 RGB image in [0, 1] ("image") and
returns only the 2D unwarping grid, 1×2×45×31 in [-1, 1] ("grid"). Weights are
stored as float16 (half the download) and cast back to float32 inside the
graph, so inference keeps full precision on WebAssembly.
"""
import sys

import numpy as np
import onnx
import onnxruntime as ort
import torch
from onnx import TensorProto, helper, numpy_helper


class Grid2D(torch.nn.Module):
    def __init__(self, net):
        super().__init__()
        self.net = net

    def forward(self, x):
        return self.net(x)[0]


def export(repo, out_path):
    sys.path.insert(0, repo)
    from model import UVDocnet

    net = UVDocnet(num_filter=32, kernel_size=5)
    ckpt = torch.load(f"{repo}/model/best_model.pkl", map_location="cpu", weights_only=False)
    net.load_state_dict(ckpt["model_state"])
    model = Grid2D(net).eval()
    x = torch.rand(1, 3, 712, 488)
    with torch.no_grad():
        reference = model(x).numpy()
    torch.onnx.export(model, (x,), out_path, input_names=["image"], output_names=["grid"], opset_version=17, dynamo=False)

    graph_model = onnx.load(out_path)
    graph = graph_model.graph
    initializers, casts = [], []
    for init in list(graph.initializer):
        arr = numpy_helper.to_array(init)
        if arr.dtype != np.float32 or arr.size < 16:
            initializers.append(init)
            continue
        half = numpy_helper.from_array(arr.astype(np.float16), init.name + "_fp16")
        initializers.append(half)
        casts.append(helper.make_node("Cast", [half.name], [init.name], to=TensorProto.FLOAT, name=init.name + "_cast"))
    del graph.initializer[:]
    graph.initializer.extend(initializers)
    nodes = list(graph.node)
    del graph.node[:]
    graph.node.extend(casts + nodes)
    onnx.checker.check_model(graph_model)
    onnx.save(graph_model, out_path)

    result = ort.InferenceSession(out_path).run(None, {"image": x.numpy()})[0]
    error_px = float(np.abs(result - reference).max()) / 2 * 1000
    print(f"saved {out_path}; max grid error vs PyTorch: {error_px:.3f} px per 1000 px")


if __name__ == "__main__":
    export(sys.argv[1], sys.argv[2])
