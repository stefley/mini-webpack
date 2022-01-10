import fs from "fs";
import path from 'path'
import parser from "@babel/parser";
import traverse from "@babel/traverse";
import { transformFromAst } from 'babel-core'
import ejs from 'ejs'

let id = 0
function createAsset(filePath) {
  /**
   * 获取文件内容
   * 获取依赖关系 ast(抽象语法树)获取依赖关系
   */

  // step1
  const source = fs.readFileSync(filePath, {
    encoding: "utf-8",
  });
  console.log(source);

  // step2
  const ast = parser.parse(source, {
    sourceType: "module",
  });

  const deps = [  ]
  traverse.default(ast, {
      ImportDeclaration({node}) {
          const value = node.source.value
          deps.push(value)
      }
  })
  // 將esmodule轉換為commonjs
  const {code} = transformFromAst(ast, null, {
    presets: ["env"]  
  })
  console.log(code)
  return {
      filePath,
      code,
      deps,
      mapping: {},
      id: id++
  };
}


function createGraph() {
    const mainAsset = createAsset("./example/main.js")
    
    const queue = [mainAsset]

    for (const asset of queue) {
       asset.deps.forEach(relativePath => {
           const filePath = path.resolve("./example", relativePath)
           const fileAsset = createAsset(filePath)
           asset.mapping[relativePath] = fileAsset.id
           queue.push(fileAsset)
       }) 
    }
    return queue
}

const graph = createGraph()

function build(graph) {
    const template = fs.readFileSync("./boundle.ejs", { encoding: 'utf-8'})
    const data = graph.map((asset) => {
        return {
            filePath: asset.filePath,
            code: asset.code,
            mapping: asset.mapping,
            id: asset.id
        }
    })
    const code = ejs.render(template, {data})
    console.log(data)
    fs.writeFileSync("./dist/boundle.js", code)
}

build(graph)