// import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/build/three.module.js';
// import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/examples/jsm/controls/OrbitControls.js';
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import React, { useRef } from "react";

class VoxelWorld {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cellSliceSize = cellSize * cellSize;
        this.cell = new Uint8Array(cellSize * cellSize * cellSize);
    }
    computeVoxelOffset(x, y, z) {
        const {cellSize, cellSliceSize} = this;
        const voxelX = THREE.MathUtils.euclideanModulo(x, cellSize) | 0;
        const voxelY = THREE.MathUtils.euclideanModulo(y, cellSize) | 0;
        const voxelZ = THREE.MathUtils.euclideanModulo(z, cellSize) | 0;
        return voxelY * cellSliceSize +
            voxelZ * cellSize +
            voxelX;
    }
    getCellForVoxel(x, y, z) {
        const {cellSize} = this;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const cellZ = Math.floor(z / cellSize);
        if (cellX !== 0 || cellY !== 0 || cellZ !== 0) {
            return null;
        }
        return this.cell;
    }
    setVoxel(x, y, z, v) {
        const cell = this.getCellForVoxel(x, y, z);
        if (!cell) {
            return;  // TODO: add a new cell?
        }
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        cell[voxelOffset] = v;
    }
    getVoxel(x, y, z) {
        const cell = this.getCellForVoxel(x, y, z);
        if (!cell) {
            return 0;
        }
        const voxelOffset = this.computeVoxelOffset(x, y, z);
        return cell[voxelOffset];
    }
    generateGeometryDataForCell(cellX, cellY, cellZ) {
        const {cellSize} = this;
        const positions = [];
        const normals = [];
        const indices = [];
        const startX = cellX * cellSize;
        const startY = cellY * cellSize;
        const startZ = cellZ * cellSize;

        for (let y = 0; y < cellSize; ++y) {
            const voxelY = startY + y;
            for (let z = 0; z < cellSize; ++z) {
                const voxelZ = startZ + z;
                for (let x = 0; x < cellSize; ++x) {
                    const voxelX = startX + x;
                    const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
                    if (voxel) {
                        // There is a voxel here but do we need faces for it?
                        for (const {dir, corners} of VoxelWorld.faces) {
                            const neighbor = this.getVoxel(
                                voxelX + dir[0],
                                voxelY + dir[1],
                                voxelZ + dir[2]);
                            if (!neighbor) {
                                // this voxel has no neighbor in this direction so we need a face.
                                const ndx = positions.length / 3;
                                for (const pos of corners) {
                                    positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                                    normals.push(...dir);
                                }
                                indices.push(
                                    ndx, ndx + 1, ndx + 2,
                                    ndx + 2, ndx + 1, ndx + 3,
                                );
                            }
                        }
                    }
                }
            }
        }

        return {
            positions,
            normals,
            indices,
        };
    }
}

VoxelWorld.faces = [
    { // left
        dir: [ -1,  0,  0, ],
        corners: [
            [ 0, 1, 0 ],
            [ 0, 0, 0 ],
            [ 0, 1, 1 ],
            [ 0, 0, 1 ],
        ],
    },
    { // right
        dir: [  1,  0,  0, ],
        corners: [
            [ 1, 1, 1 ],
            [ 1, 0, 1 ],
            [ 1, 1, 0 ],
            [ 1, 0, 0 ],
        ],
    },
    { // bottom
        dir: [  0, -1,  0, ],
        corners: [
            [ 1, 0, 1 ],
            [ 0, 0, 1 ],
            [ 1, 0, 0 ],
            [ 0, 0, 0 ],
        ],
    },
    { // top
        dir: [  0,  1,  0, ],
        corners: [
            [ 0, 1, 1 ],
            [ 1, 1, 1 ],
            [ 0, 1, 0 ],
            [ 1, 1, 0 ],
        ],
    },
    { // back
        dir: [  0,  0, -1, ],
        corners: [
            [ 1, 0, 0 ],
            [ 0, 0, 0 ],
            [ 1, 1, 0 ],
            [ 0, 1, 0 ],
        ],
    },
    { // front
        dir: [  0,  0,  1, ],
        corners: [
            [ 0, 0, 1 ],
            [ 1, 0, 1 ],
            [ 0, 1, 1 ],
            [ 1, 1, 1 ],
        ],
    },
];

const render3D = (canvasRef) => {
    // const canvas = document.querySelector('#c');
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({canvas});

    const cellSize = 32;

    const fov = 75;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(-cellSize * .3, cellSize * .8, -cellSize * .3);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2);
    controls.update();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('lightblue');

    function addLight(x, y, z) {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(x, y, z);
        scene.add(light);
    }
    addLight(-1,  2,  4);
    addLight( 1, -1, -2);

    const world = new VoxelWorld(cellSize);

    for (let y = 0; y < cellSize; ++y) {
        for (let z = 0; z < cellSize; ++z) {
            for (let x = 0; x < cellSize; ++x) {
                const height = (Math.sin(x / cellSize * Math.PI * 2) + Math.sin(z / cellSize * Math.PI * 3)) * (cellSize / 6) + (cellSize / 2);
                if (y < height) {
                    world.setVoxel(x, y, z, 1);
                }
            }
        }
    }


    const vertices = [
        // ??????
        { pos: [-1, -1,  1], norm: [ 0,  0,  1], uv: [0, 0], },
        { pos: [ 1, -1,  1], norm: [ 0,  0,  1], uv: [1, 0], },
        { pos: [-1,  1,  1], norm: [ 0,  0,  1], uv: [0, 1], },

        // { pos: [-1,  1,  1], norm: [ 0,  0,  1], uv: [0, 1], },
        // { pos: [ 1, -1,  1], norm: [ 0,  0,  1], uv: [1, 0], },
        { pos: [ 1,  1,  1], norm: [ 0,  0,  1], uv: [1, 1], },
        // ?????????
        { pos: [ 1, -1,  1], norm: [ 1,  0,  0], uv: [0, 0], },
        { pos: [ 1, -1, -1], norm: [ 1,  0,  0], uv: [1, 0], },
        // { pos: [ 1,  1,  1], norm: [ 1,  0,  0], uv: [0, 1], },

        { pos: [ 1,  1,  1], norm: [ 1,  0,  0], uv: [0, 1], },
        // { pos: [ 1, -1, -1], norm: [ 1,  0,  0], uv: [1, 0], },
        { pos: [ 1,  1, -1], norm: [ 1,  0,  0], uv: [1, 1], },
        // ??????
        { pos: [ 1, -1, -1], norm: [ 0,  0, -1], uv: [0, 0], },
        { pos: [-1, -1, -1], norm: [ 0,  0, -1], uv: [1, 0], },
        // { pos: [ 1,  1, -1], norm: [ 0,  0, -1], uv: [0, 1], },

        { pos: [ 1,  1, -1], norm: [ 0,  0, -1], uv: [0, 1], },
        // { pos: [-1, -1, -1], norm: [ 0,  0, -1], uv: [1, 0], },
        { pos: [-1,  1, -1], norm: [ 0,  0, -1], uv: [1, 1], },
        // ??????
        { pos: [-1, -1, -1], norm: [-1,  0,  0], uv: [0, 0], },
        { pos: [-1, -1,  1], norm: [-1,  0,  0], uv: [1, 0], },
        // { pos: [-1,  1, -1], norm: [-1,  0,  0], uv: [0, 1], },

        { pos: [-1,  1, -1], norm: [-1,  0,  0], uv: [0, 1], },
        // { pos: [-1, -1,  1], norm: [-1,  0,  0], uv: [1, 0], },
        { pos: [-1,  1,  1], norm: [-1,  0,  0], uv: [1, 1], },
        // ??????
        { pos: [ 1,  1, -1], norm: [ 0,  1,  0], uv: [0, 0], },
        { pos: [-1,  1, -1], norm: [ 0,  1,  0], uv: [1, 0], },
        // { pos: [ 1,  1,  1], norm: [ 0,  1,  0], uv: [0, 1], },

        { pos: [ 1,  1,  1], norm: [ 0,  1,  0], uv: [0, 1], },
        // { pos: [-1,  1, -1], norm: [ 0,  1,  0], uv: [1, 0], },
        { pos: [-1,  1,  1], norm: [ 0,  1,  0], uv: [1, 1], },
        // ??????
        { pos: [ 1, -1,  1], norm: [ 0, -1,  0], uv: [0, 0], },
        { pos: [-1, -1,  1], norm: [ 0, -1,  0], uv: [1, 0], },
        // { pos: [ 1, -1, -1], norm: [ 0, -1,  0], uv: [0, 1], },

        { pos: [ 1, -1, -1], norm: [ 0, -1,  0], uv: [0, 1], },
        // { pos: [-1, -1,  1], norm: [ 0, -1,  0], uv: [1, 0], },
        { pos: [-1, -1, -1], norm: [ 0, -1,  0], uv: [1, 1], },
    ];
    const positions = [];
    const normals = [];
    const uvs = [];
    for (const vertex of vertices) {
        positions.push(...vertex.pos);
        normals.push(...vertex.norm);
        uvs.push(...vertex.uv);
    }

    // const {positions, normals, indices} = world.generateGeometryDataForCell(0, 0, 0);
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshLambertMaterial({color: 'green'});

    const positionNumComponents = 3;
    const normalNumComponents = 3;
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents));
    geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));
    // geometry.setIndex(indices);
    geometry.setIndex([
        0,  1,  2,   2,  1,  3,
        4,  5,  6,   6,  5,  7,
        8,  9, 10,  10,  9, 11,
        12, 13, 14,  14, 13, 15,
        16, 17, 18,  18, 17, 19,
        20, 21, 22,  22, 21, 23,
    ]);

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    let renderRequested = false;

    function render() {
        renderRequested = undefined;

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        controls.update();
        renderer.render(scene, camera);
    }
    render();

    function requestRenderIfNotRequested() {
        if (!renderRequested) {
            renderRequested = true;
            requestAnimationFrame(render);
        }
    }

    controls.addEventListener('change', requestRenderIfNotRequested);
    window.addEventListener('resize', requestRenderIfNotRequested);
}

const Main = () => {
    const canvasRef = useRef(null);

    const handleClick = () => {
        render3D(canvasRef);
    }

    return (
        <React.Fragment>
            <button onClick={handleClick}>Click</button>
            <div>
                <canvas
                    ref={canvasRef}
                    width={"1500"}
                    height={"700"}
                />
            </div>
        </React.Fragment>
    )
};

export default Main;