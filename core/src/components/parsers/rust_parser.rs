// [[PROJECT_NAME]]/core/src/components/parsers/rust_parser.rs
// Purpose: [Implements a parser for Rust source code using the `syn` crate.]
// Architecture: [A specialized parser that fulfills the `LanguageParser` role for Rust. It uses the Visitor pattern (`syn::visit::Visit`) to traverse the Rust AST and extract symbols.]
// Dependencies: [syn, crate::model::symbol, crate::errors, std::path.]
use crate::errors::SecondaryMindError;
use crate::model::symbol::{Symbol, SymbolKind, SymbolLocation};
use std::fs;
use std::path::{Path, PathBuf};
use syn::spanned::Spanned;
use syn::visit::{self, Visit};
use syn::{File, Item};

/// Parses a single Rust source file and extracts all relevant symbols.
pub fn parse_rust_file(file_path: &Path) -> Result<Vec<Symbol>, SecondaryMindError> {
    let content = fs::read_to_string(file_path).map_err(|e| SecondaryMindError::IoError {
        path: file_path.to_path_buf(),
        message: e.to_string(),
    })?;

    let ast: File = syn::parse_file(&content).map_err(|e| SecondaryMindError::AstParsingError {
        file_path: file_path.to_path_buf(),
        reason: format!("syn parser error: {}", e),
    })?;

    let mut visitor = SymbolVisitor::new(file_path.to_path_buf());
    visitor.visit_file(&ast);

    Ok(visitor.symbols)
}

/// An AST visitor to collect symbols from the parsed Rust code.
struct SymbolVisitor {
    symbols: Vec<Symbol>,
    file_path: PathBuf,
}

impl SymbolVisitor {
    fn new(file_path: PathBuf) -> Self {
        SymbolVisitor {
            symbols: Vec::new(),
            file_path,
        }
    }
}

impl<'ast> Visit<'ast> for SymbolVisitor {
    fn visit_item(&mut self, i: &'ast Item) {
        let (kind, identifier, span) = match i {
            Item::Struct(s) => (SymbolKind::Struct, s.ident.to_string(), s.ident.span()),
            Item::Enum(e) => (SymbolKind::Enum, e.ident.to_string(), e.ident.span()),
            Item::Trait(t) => (SymbolKind::Trait, t.ident.to_string(), t.ident.span()),
            Item::Fn(f) => (SymbolKind::Function, f.sig.ident.to_string(), f.sig.ident.span()),
            Item::Mod(m) => (SymbolKind::Module, m.ident.to_string(), m.ident.span()),
            Item::Macro(m) => (
                SymbolKind::Macro,
                m.ident.as_ref().map_or_else(|| "unnamed".to_string(), |i| i.to_string()),
                m.ident.as_ref().map_or(m.mac.path.segments.span(), |i| i.span()),
            ),
            Item::Impl(item_impl) => {
                let type_name = match &*item_impl.self_ty {
                    syn::Type::Path(type_path) => {
                        type_path.path.segments.iter().map(|s| s.ident.to_string()).collect::<Vec<_>>().join("::")
                    }
                    _ => "unknown".to_string(),
                };
                let identifier = if let Some((_, trait_path, _)) = &item_impl.trait_ {
                    let trait_name = trait_path.segments.iter().map(|s| s.ident.to_string()).collect::<Vec<_>>().join("::");
                    format!("impl {} for {}", trait_name, type_name)
                } else {
                    format!("impl {}", type_name)
                };
                (SymbolKind::Impl, identifier, item_impl.span())
            }
            _ => {
                // Default case to continue visiting other items inside this one
                visit::visit_item(self, i);
                return;
            }
        };

        self.symbols.push(Symbol {
            identifier,
            kind,
            location: SymbolLocation {
                path: self.file_path.clone(),
                line: span.start().line,
                column: span.start().column,
            },
        });

        // Continue visiting nested items
        visit::visit_item(self, i);
    }
}
// Integration: [This module is called by the `CodebaseCartographer` when it encounters a `.rs` file.]
// Notes: [Uses `syn::visit::Visit` to efficiently walk the AST. It extracts a wide range of common Rust items. The `extra-traits` feature on `syn` is helpful for robust span handling.]
