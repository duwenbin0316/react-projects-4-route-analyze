import path from 'path'
import { Command } from 'commander'
import { analyzeProject } from '../core/analyze.js'
import { analyzeImpact } from '../core/impact.js'
import { writeJson } from '../utils/fs.js'

function outputResult(result, outputPath) {
  if (outputPath) {
    writeJson(outputPath, result)
    return
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

export function runCli(argv) {
  const program = new Command()

  program
    .name('route-analyzer')
    .description('Static route and navigation analyzer for React Router v3/v5 projects')

  program
    .command('analyze')
    .argument('<project-dir>')
    .option('--config <path>')
    .option('-o, --output <path>')
    .action((projectDir, options) => {
      const projectRoot = path.resolve(process.cwd(), projectDir)
      const result = analyzeProject(projectRoot, options)
      outputResult(result, options.output)
      process.exit(result.stats.unresolvedEdges > 0 ? 1 : 0)
    })

  program
    .command('routes')
    .argument('<project-dir>')
    .option('--config <path>')
    .option('-o, --output <path>')
    .action((projectDir, options) => {
      const projectRoot = path.resolve(process.cwd(), projectDir)
      const result = analyzeProject(projectRoot, options)
      outputResult(result.routes, options.output)
    })

  program
    .command('unresolved')
    .argument('<project-dir>')
    .option('--config <path>')
    .option('-o, --output <path>')
    .action((projectDir, options) => {
      const projectRoot = path.resolve(process.cwd(), projectDir)
      const result = analyzeProject(projectRoot, options)
      const unresolved = result.edges.filter(
        (edge) =>
          edge.confidence === 'low' ||
          edge.to.rawExpression ||
          JSON.stringify(edge.params).includes('"unresolved"'),
      )
      outputResult(unresolved, options.output)
      process.exit(unresolved.length ? 1 : 0)
    })

  program
    .command('impact')
    .argument('<project-dir>')
    .requiredOption('--target <value>')
    .option('--config <path>')
    .option('-o, --output <path>')
    .action((projectDir, options) => {
      const projectRoot = path.resolve(process.cwd(), projectDir)
      const result = analyzeProject(projectRoot, options)
      const impact = analyzeImpact(options.target, result)
      outputResult(impact, options.output)
    })

  program.parse(argv)
}
