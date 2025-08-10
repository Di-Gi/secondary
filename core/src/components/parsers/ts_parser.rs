// [[PROJECT_NAME]]/core/src/components/parsers/ts_parser.rs
// Purpose: [Implements a parser for TypeScript/JavaScript source code using the `swc` crate.]
// Architecture: [This is the refactored home for the original parsing logic from `CodebaseCartographer`. It's a specialized parser for the TS/JS ecosystem.]
// Dependencies: [swc_core, swc_common, crate::model::symbol, crate::errors, std::path.]
use crate::errors::SecondaryMindError;
use crate::model::symbol::{Symbol, SymbolKind, SymbolLocation};
use std::path::{Path, PathBuf};
use swc_common::source_map::SourceMap;
use swc_common::sync::Lrc;
use swc_core::ecma::ast::{ClassDecl, FnDecl, TsInterfaceDecl};
use swc_core::ecma::parser::{Parser, StringInput, Syntax, TsConfig};
use swc_core::ecma::visit::{Visit, VisitWith};

/// Parses a single TypeScript/JavaScript source file and extracts all top-level symbols.
pub fn parse_ts_file(file_path: &Path) -> Result<Vec<Symbol>, SecondaryMindError> {
    let cm: Lrc<SourceMap> = Default::default();
    let source_file = cm.load_file(file_path).map_err(|e| SecondaryMindError::IoError {
        path: file_path.to_path_buf(),
        message: e.to_string(),
    })?;

    let syntax = Syntax::Typescript(TsConfig {
        tsx: file_path.extension().map_or(false, |ext| ext == "tsx"),
        ..Default::default()
    });

    let mut parser = Parser::new(syntax, StringInput::from(&*source_file), None);

    let module =
        parser
            .parse_module()
            .map_err(|e| SecondaryMindError::AstParsingError {
                file_path: file_path.to_path_buf(),
                reason: format!("SWC parser error: {:?}", e),
            })?;

    let mut visitor = SymbolVisitor::new(file_path.to_path_buf(), cm);
    visitor.visit_module(&module);

    Ok(visitor.symbols)
}

/// An AST visitor to collect symbols from the parsed code.
struct SymbolVisitor {
    pub symbols: Vec<Symbol>,
    source_map: Lrc<SourceMap>,
    file_path: PathBuf,
}

impl SymbolVisitor {
    fn new(file_path: PathBuf, source_map: Lrc<SourceMap>) -> Self {
        SymbolVisitor {
            symbols: Vec::new(),
            source_map,
            file_path,
        }
    }
}

impl Visit for SymbolVisitor {
    fn visit_fn_decl(&mut self, n: &FnDecl) {
        let loc = self.source_map.lookup_char_pos(n.ident.span.lo);
        self.symbols.push(Symbol {
            identifier: n.ident.sym.to_string(),
            kind: SymbolKind::TSFunction, // Updated kind
            location: SymbolLocation {
                path: self.file_path.clone(),
                line: loc.line,
                column: loc.col_display + 1,
            },
        });
    }

    fn visit_class_decl(&mut self, n: &ClassDecl) {
        let loc = self.source_map.lookup_char_pos(n.ident.span.lo);
        self.symbols.push(Symbol {
            identifier: n.ident.sym.to_string(),
            kind: SymbolKind::TSClass, // Updated kind
            location: SymbolLocation {
                path: self.file_path.clone(),
                line: loc.line,
                column: loc.col_display + 1,
            },
        });
    }

    fn visit_ts_interface_decl(&mut self, n: &TsInterfaceDecl) {
        let loc = self.source_map.lookup_char_pos(n.id.span.lo);
        self.symbols.push(Symbol {
            identifier: n.id.sym.to_string(),
            kind: SymbolKind::TSInterface, // Updated kind
            location: SymbolLocation {
                path: self.file_path.clone(),
                line: loc.line,
                column: loc.col_display + 1,
            },
        });
        n.visit_children_with(self);
    }
}
// Integration: [This module is called by the `CodebaseCartographer` when it encounters a TS/JS file.]
// Notes: [The logic is identical to the original implementation but is now properly encapsulated in its own module. The `SymbolKind` has been updated to the new prefixed names.]
