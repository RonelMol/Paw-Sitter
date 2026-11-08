import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "./ToastContext";
import {
  Database,
  Table,
  Server,
  Layers,
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  FileSpreadsheet,
  Cpu,
  Info,
  ExternalLink,
  Check,
  X,
  Pencil,
  Save,
  Lock,
  AlertCircle,
  RotateCcw,
  Sparkles
} from "lucide-react";

interface TableInfo {
  tableName: string;
  rowCount: number;
  columnCount: number;
}

interface DatabaseOverview {
  engine: string;
  version: string;
  orm: string;
  schema: string;
  status: string;
  totalTables: number;
  totalRecords: number;
  tables: TableInfo[];
}

export function AdminDatabaseViewer() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [overview, setOverview] = useState<DatabaseOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("users");
  const [searchTerm, setSearchTerm] = useState("");

  // Table inspector state
  const [inspectTab, setInspectTab] = useState<"data" | "schema" | "trails">("data");
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [schemaColumns, setSchemaColumns] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [loadingData, setLoadingData] = useState(false);
  const [expandedJson, setExpandedJson] = useState<{ rowIdx: number; col: string; val: any } | null>(null);

  // Direct Table Editing State
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    col: string;
    val: any;
    isNull: boolean;
  } | null>(null);
  const [savingCell, setSavingCell] = useState(false);
  const [editingRowRecord, setEditingRowRecord] = useState<{
    row: any;
    formValues: Record<string, any>;
    nullFields: Record<string, boolean>;
    jsonErrors: Record<string, string>;
  } | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [justUpdatedKey, setJustUpdatedKey] = useState<string | null>(null);
  const [jsonEditVal, setJsonEditVal] = useState<string>("");
  const [jsonEditError, setJsonEditError] = useState<string | null>(null);
  const [savingJsonModal, setSavingJsonModal] = useState(false);

  // Trails management state
  const [kycTrail, setKycTrail] = useState<any[]>([]);
  const [disbursementTrail, setDisbursementTrail] = useState<any[]>([]);
  const [loadingTrails, setLoadingTrails] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchOverview();
  }, [user]);

  useEffect(() => {
    if (selectedTable && user) {
      setCurrentPage(1);
      fetchTableData(selectedTable, 1);
      fetchTableSchema(selectedTable);
    }
  }, [selectedTable]);

  useEffect(() => {
    if (inspectTab === "trails" && user) {
      fetchTrails();
    }
  }, [inspectTab]);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/database/overview", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        if (data.tables?.length > 0 && !selectedTable) {
          setSelectedTable(data.tables[0].tableName);
        }
      }
    } catch (e) {
      console.error("Failed to load DB overview", e);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchTableData = async (tableName: string, page = 1) => {
    setLoadingData(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/admin/database/table-data?table=${encodeURIComponent(tableName)}&page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTableData(data.rows || []);
        setColumns(data.columns || []);
        setTotalRows(data.total || 0);
        setCurrentPage(data.page || 1);
      }
    } catch (e) {
      console.error("Failed to load table data", e);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchTableSchema = async (tableName: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/admin/database/table-schema?table=${encodeURIComponent(tableName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchemaColumns(data.columns || []);
      }
    } catch (e) {
      console.error("Failed to load schema", e);
    }
  };

  const fetchTrails = async () => {
    setLoadingTrails(true);
    try {
      const token = await user?.getIdToken();
      const [kycRes, disbRes] = await Promise.all([
        fetch("/api/v1/sitter-verifications/admin/kyc-trail", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/v1/sitter-verifications/admin/disbursement-trail", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (kycRes.ok) {
        const kData = await kycRes.json();
        setKycTrail(kData.trail || []);
      }
      if (disbRes.ok) {
        const dData = await disbRes.json();
        setDisbursementTrail(dData.trail || []);
      }
    } catch (e) {
      console.error("Failed to load audit trails", e);
    } finally {
      setLoadingTrails(false);
    }
  };

  const handleReviewKycTrail = async (trailId: number, status: "APPROVED" | "REJECTED") => {
    setProcessingId(trailId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/sitter-verifications/admin/kyc-trail/${trailId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          adminNotes: actionNotes.trim() || `Administrative decision: ${status}`
        })
      });

      if (res.ok) {
        toast({
          title: `App KYC ${status}`,
          description: `Submission #${trailId} has been marked as ${status}.`,
          type: status === "APPROVED" ? "success" : "info"
        });
        setActionNotes("");
        fetchTrails();
        fetchOverview();
      } else {
        const err = await res.json();
        toast({ title: "Action Failed", description: err.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewDisbursementTrail = async (trailId: number, status: "APPROVED" | "REJECTED") => {
    setProcessingId(trailId);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/sitter-verifications/admin/disbursement-trail/${trailId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          adminNotes: actionNotes.trim() || `Disbursement review: ${status}`
        })
      });

      if (res.ok) {
        toast({
          title: `Disbursement ${status}`,
          description: `Disbursement submission #${trailId} has been marked as ${status}.`,
          type: status === "APPROVED" ? "success" : "info"
        });
        setActionNotes("");
        fetchTrails();
        fetchOverview();
      } else {
        const err = await res.json();
        toast({ title: "Action Failed", description: err.error, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const getPrimaryKey = (row: any) => {
    if (row && row.id !== undefined) return "id";
    const idCol = columns.find(c => c.toLowerCase().endsWith("_id") || c.toLowerCase() === "id");
    return idCol || columns[0] || "id";
  };

  const handleStartEditCell = (rowIdx: number, col: string, val: any) => {
    const isNull = val === null || val === undefined;
    setEditingCell({
      rowIdx,
      col,
      val: isNull ? "" : typeof val === "object" ? JSON.stringify(val) : String(val),
      isNull
    });
  };

  const handleSaveCell = async () => {
    if (!editingCell || !user) return;
    setSavingCell(true);
    try {
      const token = await user.getIdToken();
      const targetRow = tableData[editingCell.rowIdx];
      const pkCol = getPrimaryKey(targetRow);
      const pkVal = targetRow[pkCol];

      const res = await fetch("/api/v1/admin/database/update-cell", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          table: selectedTable,
          primaryKey: pkCol,
          primaryKeyValue: pkVal,
          column: editingCell.col,
          value: editingCell.isNull ? null : editingCell.val
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedRows = [...tableData];
        updatedRows[editingCell.rowIdx] = data.updatedRow;
        setTableData(updatedRows);

        const key = `${editingCell.rowIdx}-${editingCell.col}`;
        setJustUpdatedKey(key);
        setTimeout(() => setJustUpdatedKey(null), 3000);

        toast({
          title: "Database Updated",
          description: `Column "${editingCell.col}" in table "${selectedTable}" record #${pkVal} saved directly to PostgreSQL.`,
          type: "success"
        });
        setEditingCell(null);
      } else {
        const err = await res.json();
        toast({
          title: "Update Failed",
          description: err.error || err.cause || "Failed to update database value",
          type: "error"
        });
      }
    } catch (err: any) {
      toast({
        title: "Network Error",
        description: err.message,
        type: "error"
      });
    } finally {
      setSavingCell(false);
    }
  };

  const handleOpenRowEditor = (row: any) => {
    const formValues: Record<string, any> = {};
    const nullFields: Record<string, boolean> = {};

    columns.forEach(col => {
      const val = row[col];
      if (val === null || val === undefined) {
        nullFields[col] = true;
        formValues[col] = "";
      } else if (typeof val === "object") {
        nullFields[col] = false;
        try {
          formValues[col] = JSON.stringify(val, null, 2);
        } catch {
          formValues[col] = String(val);
        }
      } else {
        nullFields[col] = false;
        formValues[col] = val;
      }
    });

    setEditingRowRecord({
      row,
      formValues,
      nullFields,
      jsonErrors: {}
    });
  };

  const handleRowFieldChange = (col: string, val: any) => {
    if (!editingRowRecord) return;
    setEditingRowRecord(prev => {
      if (!prev) return null;
      return {
        ...prev,
        formValues: { ...prev.formValues, [col]: val },
        nullFields: { ...prev.nullFields, [col]: false }
      };
    });
  };

  const handleToggleNullField = (col: string) => {
    if (!editingRowRecord) return;
    setEditingRowRecord(prev => {
      if (!prev) return null;
      const isCurrentlyNull = !!prev.nullFields[col];
      return {
        ...prev,
        nullFields: { ...prev.nullFields, [col]: !isCurrentlyNull },
        formValues: {
          ...prev.formValues,
          [col]: !isCurrentlyNull ? "" : prev.formValues[col]
        }
      };
    });
  };

  const handleFormatJsonField = (col: string) => {
    if (!editingRowRecord) return;
    const currentStr = editingRowRecord.formValues[col];
    try {
      const parsed = JSON.parse(currentStr);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditingRowRecord(prev => {
        if (!prev) return null;
        const newErrors = { ...prev.jsonErrors };
        delete newErrors[col];
        return {
          ...prev,
          formValues: { ...prev.formValues, [col]: formatted },
          jsonErrors: newErrors
        };
      });
      toast({ title: "JSON Formatted", description: `Field ${col} syntax is valid.`, type: "info" });
    } catch (e: any) {
      setEditingRowRecord(prev => {
        if (!prev) return null;
        return {
          ...prev,
          jsonErrors: { ...prev.jsonErrors, [col]: e.message }
        };
      });
      toast({ title: "Invalid JSON", description: e.message, type: "error" });
    }
  };

  const handleSaveRow = async () => {
    if (!editingRowRecord || !user) return;
    setSavingRow(true);
    try {
      const token = await user.getIdToken();
      const pkCol = getPrimaryKey(editingRowRecord.row);
      const pkVal = editingRowRecord.row[pkCol];

      const updates: Record<string, any> = {};
      for (const col of columns) {
        if (col === pkCol) continue; // Don't alter primary key
        if (editingRowRecord.nullFields[col]) {
          updates[col] = null;
        } else {
          updates[col] = editingRowRecord.formValues[col];
        }
      }

      const res = await fetch("/api/v1/admin/database/update-row", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          table: selectedTable,
          primaryKey: pkCol,
          primaryKeyValue: pkVal,
          updates
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedRow = data.updatedRow;
        setTableData(prev => prev.map(r => r[pkCol] === pkVal ? updatedRow : r));

        setJustUpdatedKey(String(pkVal));
        setTimeout(() => setJustUpdatedKey(null), 3000);

        toast({
          title: "Record Updated in PostgreSQL",
          description: `Table "${selectedTable}" record #${pkVal} successfully committed.`,
          type: "success"
        });
        setEditingRowRecord(null);
      } else {
        const err = await res.json();
        toast({
          title: "Save Failed",
          description: err.error || err.cause || "Failed to update record in database",
          type: "error"
        });
      }
    } catch (err: any) {
      toast({
        title: "Network Error",
        description: err.message,
        type: "error"
      });
    } finally {
      setSavingRow(false);
    }
  };

  const handleSaveJsonModal = async () => {
    if (!expandedJson || !user) return;
    setSavingJsonModal(true);
    try {
      let parsedVal: any;
      try {
        parsedVal = JSON.parse(jsonEditVal);
        setJsonEditError(null);
      } catch (err: any) {
        setJsonEditError(err.message);
        setSavingJsonModal(false);
        toast({ title: "Invalid JSON", description: err.message, type: "error" });
        return;
      }

      const token = await user.getIdToken();
      const targetRow = tableData[expandedJson.rowIdx];
      const pkCol = getPrimaryKey(targetRow);
      const pkVal = targetRow[pkCol];

      const res = await fetch("/api/v1/admin/database/update-cell", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          table: selectedTable,
          primaryKey: pkCol,
          primaryKeyValue: pkVal,
          column: expandedJson.col,
          value: parsedVal
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedRows = [...tableData];
        updatedRows[expandedJson.rowIdx] = data.updatedRow;
        setTableData(updatedRows);

        toast({
          title: "JSON Column Updated",
          description: `Successfully updated ${expandedJson.col} in ${selectedTable} #${pkVal}.`,
          type: "success"
        });
        setExpandedJson(null);
      } else {
        const err = await res.json();
        toast({ title: "Save Failed", description: err.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Network Error", description: err.message, type: "error" });
    } finally {
      setSavingJsonModal(false);
    }
  };

  const filteredTables = (overview?.tables || []).filter(t =>
    t.tableName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalRows / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Database Engine Specs Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600/30 border border-blue-400/40 rounded-2xl text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-black">Admin Database Inspector</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Connected
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Complete architecture visibility into all tables, schema definitions, and live records.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                fetchOverview();
                if (selectedTable) fetchTableData(selectedTable, currentPage);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? "animate-spin" : ""}`} />
              <span>Refresh Tables</span>
            </button>
          </div>

          {/* Architecture Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Engine</span>
              <span className="font-bold text-xs text-white flex items-center gap-1 mt-0.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                {overview?.engine || "PostgreSQL 15"}
              </span>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Driver & ORM</span>
              <span className="font-bold text-xs text-white flex items-center gap-1 mt-0.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                Drizzle ORM + pg.Pool
              </span>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Database Tables</span>
              <span className="font-black text-xs text-emerald-400 mt-0.5 block">
                {overview?.totalTables || 0} Tables
              </span>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Stored Records</span>
              <span className="font-black text-xs text-amber-400 mt-0.5 block">
                {overview?.totalRecords?.toLocaleString() || 0} Rows
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Explorer Layout: Left Table Selector + Right Table View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Tables Directory */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Public Tables ({overview?.tables?.length || 0})
            </h3>
          </div>

          {/* Table Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter tables..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Tables List */}
          <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
            {filteredTables.map((t) => {
              const isSelected = selectedTable === t.tableName;
              const isTrailTable = t.tableName.includes("trail");

              return (
                <button
                  key={t.tableName}
                  onClick={() => setSelectedTable(t.tableName)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs font-bold"
                      : "hover:bg-slate-50 text-slate-700 font-medium"
                  }`}
                >
                  <div className="truncate flex items-center gap-2">
                    <Table className={`w-3.5 h-3.5 ${isSelected ? "text-blue-300" : isTrailTable ? "text-purple-600" : "text-slate-400"}`} />
                    <span className="truncate">{t.tableName}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ml-1 ${
                      isSelected
                        ? "bg-slate-800 text-slate-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {t.rowCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Table Viewer */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Table Viewer Header */}
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  table: {selectedTable}
                </span>
                <span className="text-xs text-slate-500">
                  ({totalRows} total rows • {schemaColumns.length} columns)
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setInspectTab("data")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  inspectTab === "data" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Live Data Rows</span>
              </button>

              <button
                onClick={() => setInspectTab("schema")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  inspectTab === "schema" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Schema & Columns</span>
              </button>

              <button
                onClick={() => setInspectTab("trails")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  inspectTab === "trails" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Audit Trails Decision Center</span>
              </button>
            </div>
          </div>

          {/* TAB 1: LIVE DATA ROWS */}
          {inspectTab === "data" && (
            <div className="flex-1 flex flex-col justify-between p-5 space-y-4">
              {/* Direct Editing Quick Guidance */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-600 text-white rounded-xl shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Direct Database Editing Active:</span>{" "}
                    <span className="text-slate-600">
                      Click <Pencil className="w-3 h-3 inline text-blue-600 mx-0.5" /> or double-click any cell to edit in-place, or click <strong>Edit Row</strong> for the full record form.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                    Target Table: {selectedTable}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchTableData(selectedTable, currentPage)}
                    className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors"
                    title="Refresh Table Data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {loadingData ? (
                <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Loading table records from PostgreSQL...</span>
                </div>
              ) : tableData.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  This table currently has 0 rows.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                      <tr>
                        {columns.map((col) => (
                          <th key={col} className="px-3.5 py-3 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                        <th className="px-3.5 py-3 whitespace-nowrap text-right sticky right-0 bg-slate-50 font-bold text-slate-700 shadow-xs">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {tableData.map((row, rowIdx) => {
                        const pkCol = getPrimaryKey(row);
                        const pkVal = row[pkCol];
                        const isRowJustUpdated = justUpdatedKey === String(pkVal);

                        return (
                          <tr
                            key={row.id || rowIdx}
                            className={`transition-colors ${
                              isRowJustUpdated
                                ? "bg-emerald-50/90 transition-all duration-700"
                                : "hover:bg-slate-50/70"
                            }`}
                          >
                            {columns.map((col) => {
                              const val = row[col];
                              const isObj = val !== null && typeof val === "object";
                              const isBool = typeof val === "boolean";
                              const isCellEditing = editingCell?.rowIdx === rowIdx && editingCell?.col === col;
                              const isCellJustUpdated = justUpdatedKey === `${rowIdx}-${col}`;

                              // Inline active editing UI
                              if (isCellEditing) {
                                const colSchema = schemaColumns.find((sc) => sc.column_name === col);
                                const isColBool = colSchema?.data_type?.toLowerCase().includes("bool") || isBool;

                                return (
                                  <td
                                    key={col}
                                    className="px-2 py-1.5 whitespace-nowrap bg-blue-50/90 border-2 border-blue-400 rounded-lg shadow-xs"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {isColBool ? (
                                        <select
                                          value={editingCell.isNull ? "NULL" : editingCell.val === "true" || editingCell.val === true ? "TRUE" : "FALSE"}
                                          onChange={(e) => {
                                            if (e.target.value === "NULL") {
                                              setEditingCell({ ...editingCell, isNull: true, val: null });
                                            } else {
                                              setEditingCell({ ...editingCell, isNull: false, val: e.target.value === "TRUE" });
                                            }
                                          }}
                                          className="text-[11px] font-mono font-bold bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-blue-500"
                                          autoFocus
                                        >
                                          <option value="TRUE">TRUE</option>
                                          <option value="FALSE">FALSE</option>
                                          {colSchema?.is_nullable === "YES" && <option value="NULL">NULL</option>}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={editingCell.isNull ? "" : editingCell.val}
                                          placeholder={editingCell.isNull ? "NULL" : "Enter value..."}
                                          disabled={editingCell.isNull}
                                          onChange={(e) => setEditingCell({ ...editingCell, val: e.target.value, isNull: false })}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveCell();
                                            if (e.key === "Escape") setEditingCell(null);
                                          }}
                                          className="text-[11px] font-mono bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 min-w-[120px] max-w-[240px] focus:outline-blue-500 shadow-2xs"
                                          autoFocus
                                        />
                                      )}

                                      {/* Null Toggle button if nullable */}
                                      {colSchema?.is_nullable === "YES" && !isColBool && (
                                        <button
                                          type="button"
                                          onClick={() => setEditingCell({ ...editingCell, isNull: !editingCell.isNull, val: !editingCell.isNull ? null : "" })}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                            editingCell.isNull
                                              ? "bg-amber-100 text-amber-800 border-amber-300"
                                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                          }`}
                                          title="Toggle NULL value"
                                        >
                                          NULL
                                        </button>
                                      )}

                                      {/* Save Button */}
                                      <button
                                        type="button"
                                        disabled={savingCell}
                                        onClick={handleSaveCell}
                                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs disabled:opacity-50"
                                        title="Save to database (Enter)"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Cancel Button */}
                                      <button
                                        type="button"
                                        disabled={savingCell}
                                        onClick={() => setEditingCell(null)}
                                        className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                                        title="Cancel (Esc)"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                );
                              }

                              // Standard cell rendering with inline hover edit
                              return (
                                <td
                                  key={col}
                                  onDoubleClick={() => handleStartEditCell(rowIdx, col, val)}
                                  className={`px-3.5 py-2.5 whitespace-nowrap text-slate-800 font-mono text-[11px] max-w-xs group cursor-pointer transition-colors ${
                                    isCellJustUpdated ? "bg-emerald-100/90 text-emerald-950 font-bold" : ""
                                  }`}
                                  title="Double-click to edit cell"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="truncate">
                                      {isObj ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedJson({ rowIdx, col, val });
                                            setJsonEditVal(JSON.stringify(val, null, 2));
                                            setJsonEditError(null);
                                          }}
                                          className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-[10px] font-bold transition-colors"
                                        >
                                          View / Edit JSON
                                        </button>
                                      ) : isBool ? (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            val ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                          }`}
                                        >
                                          {val ? "TRUE" : "FALSE"}
                                        </span>
                                      ) : val === null || val === undefined ? (
                                        <span className="text-slate-300 italic">null</span>
                                      ) : (
                                        String(val)
                                      )}
                                    </div>

                                    {/* Subtle Pencil Icon on Hover */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditCell(rowIdx, col, val);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded transition-all"
                                      title="Edit this value"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              );
                            })}

                            {/* Actions Column */}
                            <td className="px-3.5 py-2 whitespace-nowrap text-right sticky right-0 bg-white/95 group-hover:bg-slate-50/95 border-l border-slate-100 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleOpenRowEditor(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 font-bold text-[11px] transition-all shadow-2xs active:scale-95"
                                title={`Edit all fields of ${selectedTable} #${pkVal}`}
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit Row</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
                  <span className="font-bold text-slate-900">{totalPages}</span> ({totalRows} total rows)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1 || loadingData}
                    onClick={() => {
                      const prev = Math.max(1, currentPage - 1);
                      setCurrentPage(prev);
                      fetchTableData(selectedTable, prev);
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 font-bold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages || loadingData}
                    onClick={() => {
                      const next = currentPage + 1;
                      setCurrentPage(next);
                      fetchTableData(selectedTable, next);
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 font-bold"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEMA & COLUMNS */}
          {inspectTab === "schema" && (
            <div className="p-5">
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Column Name</th>
                      <th className="px-4 py-3">PostgreSQL Data Type</th>
                      <th className="px-4 py-3">Nullable</th>
                      <th className="px-4 py-3">Default Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {schemaColumns.map((col, idx) => (
                      <tr key={col.column_name} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{col.column_name}</td>
                        <td className="px-4 py-2.5 font-mono text-blue-700 bg-blue-50/50">
                          {col.data_type}
                          {col.character_maximum_length ? `(${col.character_maximum_length})` : ""}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${col.is_nullable === "YES" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}`}>
                            {col.is_nullable === "YES" ? "NULLABLE" : "NOT NULL"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500 text-[10px]">
                          {col.column_default || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT TRAILS DECISION CENTER */}
          {inspectTab === "trails" && (
            <div className="p-5 space-y-6">
              {/* Optional Decision Notes Input */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Admin Decision Notes (Applied to next approval/rejection)
                </label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Identity verified against DFA Passport records. Approved."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              {/* 1. App KYC Trail */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    App KYC Historical Submissions ({kycTrail.length})
                  </h4>
                </div>

                {kycTrail.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No KYC submissions in trail.</div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs divide-y divide-slate-100">
                      <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Sitter / Name</th>
                          <th className="px-3 py-2">ID Document</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Submitted</th>
                          <th className="px-3 py-2 text-right">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {kycTrail.map((k) => (
                          <tr key={k.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-mono text-slate-400">#{k.id}</td>
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-slate-900">
                                {[k.legalFirstName, k.legalMiddleName, k.legalLastName].filter(Boolean).join(" ")}
                              </div>
                              <div className="text-[11px] text-slate-500">{k.sitterEmail || k.phone}</div>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-700">
                              <div>{k.idType}</div>
                              <div className="text-[10px] font-mono text-slate-500">{k.idNumber}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  k.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : k.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {k.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                              {k.submittedAt ? new Date(k.submittedAt).toLocaleDateString() : "Recent"}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={processingId === k.id || k.status === "APPROVED"}
                                  onClick={() => handleReviewKycTrail(k.id, "APPROVED")}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-40 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={processingId === k.id || k.status === "REJECTED"}
                                  onClick={() => handleReviewKycTrail(k.id, "REJECTED")}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold disabled:opacity-40 flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. Disbursement Trail */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Payout Disbursement Submissions ({disbursementTrail.length})
                  </h4>
                </div>

                {disbursementTrail.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No disbursement submissions in trail.</div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs divide-y divide-slate-100">
                      <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Sitter</th>
                          <th className="px-3 py-2">Bank / E-Wallet</th>
                          <th className="px-3 py-2">Account Number</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {disbursementTrail.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-mono text-slate-400">#{d.id}</td>
                            <td className="px-3 py-2.5">
                              <div className="font-bold text-slate-900">{d.bankAccountName}</div>
                              <div className="text-[11px] text-slate-500">{d.sitterEmail}</div>
                            </td>
                            <td className="px-3 py-2.5 font-bold text-emerald-800">{d.bankName}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-800">{d.bankAccountNumber}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  d.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : d.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {d.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={processingId === d.id || d.status === "APPROVED"}
                                  onClick={() => handleReviewDisbursementTrail(d.id, "APPROVED")}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-40 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={processingId === d.id || d.status === "REJECTED"}
                                  onClick={() => handleReviewDisbursementTrail(d.id, "REJECTED")}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold disabled:opacity-40 flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Row Record Modal */}
      {editingRowRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Edit Record in Table:</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      {selectedTable}
                    </span>
                    <span className="text-slate-400">#</span>
                    <span className="font-mono text-slate-700">
                      {editingRowRecord.row[getPrimaryKey(editingRowRecord.row)]}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Values saved here update the live PostgreSQL database table directly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingRow}
                onClick={() => setEditingRowRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Column Form Fields */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[60vh]">
              {columns.map((col) => {
                const pkCol = getPrimaryKey(editingRowRecord.row);
                const isPk = col === pkCol;
                const colSchema = schemaColumns.find((sc) => sc.column_name === col);
                const dataType = (colSchema?.data_type || "").toLowerCase();
                const isNullable = colSchema?.is_nullable === "YES";
                const isBool = dataType.includes("bool") || typeof editingRowRecord.row[col] === "boolean";
                const isJson = dataType.includes("json") || typeof editingRowRecord.row[col] === "object";
                const isNull = editingRowRecord.nullFields[col];
                const currentVal = editingRowRecord.formValues[col];

                return (
                  <div
                    key={col}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isPk
                        ? "bg-slate-50 border-slate-200 opacity-90"
                        : isNull
                        ? "bg-amber-50/40 border-amber-200"
                        : "bg-white border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-mono font-bold text-slate-800">
                          {col}
                        </label>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {dataType || "text"}
                        </span>
                        {isPk && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Primary Key
                          </span>
                        )}
                      </div>

                      {/* NULL Toggle Switch for Nullable Columns */}
                      {!isPk && isNullable && (
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isNull}
                            onChange={() => handleToggleNullField(col)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className={isNull ? "font-bold text-amber-700" : ""}>Set to NULL</span>
                        </label>
                      )}
                    </div>

                    {/* Input Field Rendering based on Type */}
                    {isPk ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          disabled
                          value={String(editingRowRecord.row[col] ?? "")}
                          className="w-full text-xs font-mono bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    ) : isNull ? (
                      <div className="text-xs font-mono italic text-amber-800 bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2">
                        null (PostgreSQL NULL)
                      </div>
                    ) : isBool ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRowFieldChange(col, true)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            currentVal === true || currentVal === "true"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          TRUE
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRowFieldChange(col, false)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            currentVal === false || currentVal === "false"
                              ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          FALSE
                        </button>
                      </div>
                    ) : isJson ? (
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleFormatJsonField(col)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                          >
                            Validate & Format JSON
                          </button>
                        </div>
                        <textarea
                          rows={5}
                          value={currentVal}
                          onChange={(e) => handleRowFieldChange(col, e.target.value)}
                          className={`w-full text-xs font-mono bg-slate-900 text-emerald-400 border rounded-xl p-3 focus:outline-blue-500 ${
                            editingRowRecord.jsonErrors[col] ? "border-rose-500 ring-2 ring-rose-200" : "border-slate-800"
                          }`}
                        />
                        {editingRowRecord.jsonErrors[col] && (
                          <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {editingRowRecord.jsonErrors[col]}
                          </div>
                        )}
                      </div>
                    ) : dataType.includes("int") || dataType.includes("numeric") || dataType.includes("float") ? (
                      <input
                        type="number"
                        step="any"
                        value={currentVal ?? ""}
                        onChange={(e) => handleRowFieldChange(col, e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-blue-500"
                      />
                    ) : col.includes("reason") || col.includes("notes") || col.includes("bio") || col.includes("address") || String(currentVal || "").length > 60 ? (
                      <textarea
                        rows={3}
                        value={currentVal ?? ""}
                        onChange={(e) => handleRowFieldChange(col, e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={currentVal ?? ""}
                        onChange={(e) => handleRowFieldChange(col, e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-blue-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Changes take effect in Cloud SQL instantly upon saving.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingRow}
                  onClick={() => setEditingRowRecord(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingRow}
                  onClick={handleSaveRow}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingRow ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes to Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded JSON Modal (with direct editing & database commit) */}
      {expandedJson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {selectedTable}.{expandedJson.col}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  (Row #{expandedJson.rowIdx + 1})
                </span>
              </div>
              <button
                onClick={() => setExpandedJson(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Directly edit this JSON value and click <strong>Save to DB</strong> to update PostgreSQL.
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonEditVal);
                    setJsonEditVal(JSON.stringify(parsed, null, 2));
                    setJsonEditError(null);
                    toast({ title: "Valid JSON", description: "Syntax formatted nicely.", type: "info" });
                  } catch (e: any) {
                    setJsonEditError(e.message);
                    toast({ title: "Invalid JSON", description: e.message, type: "error" });
                  }
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Validate & Format
              </button>
            </div>

            <textarea
              rows={12}
              value={jsonEditVal}
              onChange={(e) => {
                setJsonEditVal(e.target.value);
                setJsonEditError(null);
              }}
              className={`flex-1 overflow-y-auto bg-slate-900 p-4 rounded-2xl text-emerald-400 font-mono text-xs whitespace-pre focus:outline-blue-500 border ${
                jsonEditError ? "border-rose-500 ring-2 ring-rose-200" : "border-slate-800"
              }`}
            />

            {jsonEditError && (
              <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>JSON Syntax Error: {jsonEditError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setJsonEditVal(JSON.stringify(expandedJson.val, null, 2));
                  setJsonEditError(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Original
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingJsonModal}
                  onClick={() => setExpandedJson(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingJsonModal}
                  onClick={handleSaveJsonModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingJsonModal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Database...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save to Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
