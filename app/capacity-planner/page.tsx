"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TEAM_MEMBERS_CONFIG, CONSTANTS, Role } from "@/lib/capacity-constants";
import { getConfig, getCurrentSprintIndex, getSprintNumber, formatSprintRelease } from "@/lib/sprint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { pb } from "@/lib/pocketbase";
import { Loader2, Save, Lock, Unlock, Plus, PlayCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TeamMemberState = {
    name: string;
    role: Role;
    leaveDays: number;
    publicHolidayDays: number;
    fullCapacityPoints: number;
    id?: string;
};

type SprintRecord = {
    id: string;
    name: string;
    created: string;
};

const calculateCurrentSprintName = () => {
    try {
        const config = getConfig();
        const currentIndex = getCurrentSprintIndex(config);
        const sprintNum = getSprintNumber(config, currentIndex);
        const formatted = formatSprintRelease(sprintNum);
        return `Sprint ${formatted}.0`;
    } catch (e) {
        console.error("Failed to calculate sprint number:", e);
        return "Sprint 1.195.0";
    }
};

const roleBadgeVariant = (role: Role) => {
    switch (role) {
        case "Engineer": return "default";
        case "QA": return "secondary";
        default: return "outline";
    }
};

const roleBadgeClass = (role: Role) => {
    switch (role) {
        case "Engineer": return "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300";
        case "QA": return "bg-violet-100 text-violet-700 hover:bg-violet-100 dark:bg-violet-900 dark:text-violet-300";
        default: return "";
    }
};

function CapacityPlannerContent() {
    const searchParams = useSearchParams();
    const [sprintId, setSprintId] = useState<string | null>(null);
    const [sprintName, setSprintName] = useState(calculateCurrentSprintName());
    const [sprintStatus, setSprintStatus] = useState<string>("planned");
    const [sprintHistory, setSprintHistory] = useState<SprintRecord[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showNewSprintDialog, setShowNewSprintDialog] = useState(false);

    const [isEditMode, setIsEditMode] = useState(false);

    const [members, setMembers] = useState<TeamMemberState[]>([]);

    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<Role>("Engineer");

    const [leadEffortHours, setLeadEffortHours] = useState(8);
    const [supportEffortHours, setSupportEffortHours] = useState(8);

    const [releaseEffortPoints, setReleaseEffortPoints] = useState(0);
    const [leadEffortPointsInput, setLeadEffortPointsInput] = useState(2);
    const [supportEffortPointsInput, setSupportEffortPointsInput] = useState(0);

    const [devCapacityFactorPercent, setDevCapacityFactorPercent] = useState(CONSTANTS.DEV_CAPACITY_FACTOR * 100);
    const [qaCapacityFactorPercent, setQaCapacityFactorPercent] = useState(CONSTANTS.QA_CAPACITY_FACTOR * 100);

    const loadSprintData = async (targetSprintId?: string) => {
        setIsLoading(true);
        try {
            const historyResult = await pb.collection('sprints').getList(1, 50, {
                sort: '-created',
            });
            const history = historyResult.items.map(i => ({ id: i.id, name: i.name, created: i.created }));
            setSprintHistory(history);

            let sprint = null;
            if (targetSprintId) {
                sprint = await pb.collection('sprints').getOne(targetSprintId);
            } else if (historyResult.items.length > 0) {
                sprint = historyResult.items[0];
            }

            if (sprint) {
                setSprintId(sprint.id);
                setSprintName(sprint.name);
                setSprintStatus(sprint.status || "planned");

                setLeadEffortHours(sprint.lead_effort_hours || 8);
                setSupportEffortHours(sprint.support_effort_hours || 8);
                setReleaseEffortPoints(sprint.release_effort_points || 0);
                setLeadEffortPointsInput(sprint.lead_effort_points_input || 2);
                setSupportEffortPointsInput(sprint.support_effort_points_input || 0);
                setDevCapacityFactorPercent(sprint.dev_capacity_factor || CONSTANTS.DEV_CAPACITY_FACTOR * 100);
                setQaCapacityFactorPercent(sprint.qa_capacity_factor || CONSTANTS.QA_CAPACITY_FACTOR * 100);

                const caps = await pb.collection('capacities').getFullList({
                    filter: `sprint="${sprint.id}"`
                });

                const allNames = new Set([
                    ...TEAM_MEMBERS_CONFIG.map(m => m.name),
                    ...caps.map(c => c.name)
                ]);

                const mergedMembers: TeamMemberState[] = [];

                allNames.forEach(name => {
                    const dbRecord = caps.find(c => c.name === name);
                    const configRecord = TEAM_MEMBERS_CONFIG.find(c => c.name === name);
                    const role = (dbRecord?.role as Role) || (configRecord?.role as Role) || 'Engineer';

                    mergedMembers.push({
                        name: name,
                        role: role,
                        leaveDays: dbRecord?.leave_days || 0,
                        publicHolidayDays: dbRecord?.public_holiday_days || 0,
                        fullCapacityPoints: dbRecord?.full_capacity_points || 20,
                        id: dbRecord?.id
                    });
                });

                setMembers(mergedMembers);
            } else {
                const initialMembers = TEAM_MEMBERS_CONFIG.map(m => ({
                    name: m.name,
                    role: m.role as Role,
                    leaveDays: 0,
                    publicHolidayDays: 0,
                    fullCapacityPoints: 20
                }));
                setMembers(initialMembers);
            }
        } catch (err) {
            console.error("Failed to load sprint data:", err);
            toast.error("Failed to load sprint data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const urlSprintId = searchParams.get('sprintId');
        if (urlSprintId) {
            loadSprintData(urlSprintId);
        } else {
            loadSprintData();
        }
    }, [searchParams]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const sprintData = {
                name: sprintName,
                status: sprintStatus,
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                lead_effort_hours: leadEffortHours,
                support_effort_hours: supportEffortHours,
                release_effort_points: releaseEffortPoints,
                lead_effort_points_input: leadEffortPointsInput,
                support_effort_points_input: supportEffortPointsInput,
                dev_capacity_factor: devCapacityFactorPercent,
                qa_capacity_factor: qaCapacityFactorPercent
            };

            let currentSprintId = sprintId;

            if (currentSprintId) {
                await pb.collection('sprints').update(currentSprintId, sprintData);
            } else {
                const rec = await pb.collection('sprints').create(sprintData);
                currentSprintId = rec.id;
                setSprintId(rec.id);
            }

            await Promise.all(members.map(async (m) => {
                const capData = {
                    sprint: currentSprintId,
                    name: m.name,
                    role: m.role,
                    leave_days: m.leaveDays,
                    public_holiday_days: m.publicHolidayDays,
                    full_capacity_points: m.fullCapacityPoints,
                    working_days: 10 - m.leaveDays - m.publicHolidayDays,
                };

                if (m.id) {
                    await pb.collection('capacities').update(m.id, capData);
                } else {
                    await pb.collection('capacities').create(capData);
                }
            }));

            toast.success("Changes saved successfully!");
            loadSprintData(currentSprintId!);

        } catch (err) {
            console.error("Error saving:", err);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleNewSprint = () => {
        setShowNewSprintDialog(true);
    };

    const confirmNewSprint = async () => {
        setShowNewSprintDialog(false);
        setIsSaving(true);
        try {
            const versionMatch = sprintName.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
            let nextName = "Sprint Next";

            if (versionMatch) {
                const major = parseInt(versionMatch[1]);
                const minor = parseInt(versionMatch[2]);
                const patch = versionMatch[3] ? parseInt(versionMatch[3]) : 0;
                const nextMinor = minor + 1;
                nextName = `Sprint ${major}.${nextMinor}.${patch}`;
            } else {
                nextName = `${sprintName} (Next)`;
            }

            if (sprintId) {
                await pb.collection('sprints').update(sprintId, {
                    status: 'finished'
                });
            }

            const sprintData = {
                name: nextName,
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                lead_effort_hours: leadEffortHours,
                support_effort_hours: supportEffortHours,
                release_effort_points: releaseEffortPoints,
                lead_effort_points_input: leadEffortPointsInput,
                support_effort_points_input: supportEffortPointsInput,
                dev_capacity_factor: devCapacityFactorPercent,
                qa_capacity_factor: qaCapacityFactorPercent
            };
            const newSprint = await pb.collection('sprints').create(sprintData);

            await Promise.all(members.map(async (m) => {
                const capData = {
                    sprint: newSprint.id,
                    name: m.name,
                    role: m.role,
                    leave_days: 0,
                    public_holiday_days: 0,
                    full_capacity_points: m.fullCapacityPoints,
                    working_days: 10,
                };
                await pb.collection('capacities').create(capData);
            }));

            toast.success(`Started ${nextName}!`);
            loadSprintData(newSprint.id);

        } catch (e) {
            console.error(e);
            toast.error("Failed to start new sprint.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddMember = () => {
        if (!newMemberName.trim()) return;
        setMembers(prev => [
            ...prev,
            {
                name: newMemberName,
                role: newMemberRole,
                leaveDays: 0,
                publicHolidayDays: 0,
                fullCapacityPoints: 20
            }
        ]);
        setNewMemberName("");
    };

    const leadEffortPoints = leadEffortHours * CONSTANTS.HOURS_TO_POINTS;
    const supportEffortPoints = supportEffortHours * CONSTANTS.HOURS_TO_POINTS;
    const totalSharedDeductionPoints = leadEffortPoints + supportEffortPoints;

    const calculatedMembers = useMemo(() => {
        return members.map(m => {
            const leavePoints = m.leaveDays * CONSTANTS.DAYS_TO_POINTS;
            const phPoints = m.publicHolidayDays * CONSTANTS.DAYS_TO_POINTS;
            const deduction = leavePoints + phPoints + totalSharedDeductionPoints;

            let currentCapacity = m.fullCapacityPoints - deduction;
            if (currentCapacity < 0) currentCapacity = 0;

            return {
                ...m,
                currentCapacity
            };
        });
    }, [members, totalSharedDeductionPoints]);

    const updateMember = (index: number, field: keyof TeamMemberState, value: number) => {
        setMembers(prev => {
            const newMembers = [...prev];
            newMembers[index] = { ...newMembers[index], [field]: value };
            return newMembers;
        });
    };

    const roleEffortTotal = releaseEffortPoints + leadEffortPointsInput + supportEffortPointsInput;
    const sharedOverheadTotal = totalSharedDeductionPoints;
    const teamEffortTotal = roleEffortTotal + sharedOverheadTotal;

    const devMembers = calculatedMembers.filter(m => m.role === 'Engineer');
    const qaMembers = calculatedMembers.filter(m => m.role === 'QA');

    const sumDevCurrentCapacity = devMembers.reduce((acc, m) => acc + m.currentCapacity, 0);
    const sumQACurrentCapacity = qaMembers.reduce((acc, m) => acc + m.currentCapacity, 0);

    const currentDevCapacity = sumDevCurrentCapacity - teamEffortTotal;
    const minSprintCapacityDev = currentDevCapacity * (devCapacityFactorPercent / 100);
    const minSprintCapacityQA = sumQACurrentCapacity * (qaCapacityFactorPercent / 100);

    const totalPlannedCapacity = minSprintCapacityDev + minSprintCapacityQA;
    const maxPlannedCapacity = totalPlannedCapacity * CONSTANTS.BUFFER_FACTOR;
    const codeFreezeCommitment = totalPlannedCapacity * CONSTANTS.CODE_FREEZE_FACTOR;

    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-10 w-[280px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                </div>
                <Skeleton className="h-64 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-80 rounded-xl" />
                    <Skeleton className="h-80 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header toolbar */}
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:justify-between md:items-center">
                    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center min-w-0">
                        <div
                            className={`flex items-center gap-3 select-none ${sprintStatus === 'finished' ? '' : 'cursor-default'}`}
                            onDoubleClick={() => {
                                if (sprintStatus !== 'finished') {
                                    setIsEditMode(prev => !prev);
                                }
                            }}
                        >
                            <h1 className="text-2xl font-bold">Capacity Planner</h1>
                            {sprintStatus === 'finished' ? (
                                <Badge variant="secondary" className="text-xs">
                                    <Lock className="w-3 h-3 mr-1" /> Finished
                                </Badge>
                            ) : isEditMode ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 text-xs">
                                    <Unlock className="w-3 h-3 mr-1" /> Editing
                                </Badge>
                            ) : null}
                        </div>

                        <Select value={sprintId || ""} onValueChange={(val) => loadSprintData(val)}>
                            <SelectTrigger className="w-full md:w-[280px] font-medium min-w-0">
                                <SelectValue placeholder="Select Sprint" />
                            </SelectTrigger>
                            <SelectContent>
                                {sprintHistory.map(h => (
                                    <SelectItem key={h.id} value={h.id}>
                                        {h.name} <span className="text-xs text-muted-foreground ml-2">({new Date(h.created).toLocaleDateString()})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {isEditMode && (
                            <>
                                <Button variant="outline" onClick={handleNewSprint} disabled={isSaving} className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 min-h-[44px]">
                                    <PlayCircle className="mr-2 h-4 w-4" /> Start Next Sprint
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving} className="min-h-[44px]">
                                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Summary Hero -- moved to top */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardContent className="pt-6 text-center">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Planned Capacity</p>
                            <p className="text-4xl font-extrabold text-primary my-1">{totalPlannedCapacity.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Points</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dev Working Capacity</p>
                            <p className="text-3xl font-bold my-1">{minSprintCapacityDev.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Points ({devCapacityFactorPercent}%)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QA Working Capacity</p>
                            <p className="text-3xl font-bold my-1">{minSprintCapacityQA.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Points ({qaCapacityFactorPercent}%)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Team capacity table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Team Capacity ({sprintName})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Mobile: card per member */}
                        <div className="md:hidden space-y-4">
                            {calculatedMembers.map((m, idx) => (
                                <div key={m.name} className="rounded-lg border p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                                                {m.name.charAt(0)}
                                            </div>
                                            <span className="font-medium">{m.name}</span>
                                        </div>
                                        <Badge variant="outline" className={roleBadgeClass(m.role)}>
                                            {m.role}
                                        </Badge>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <dt className="text-muted-foreground">Leave (Days)</dt>
                                            <dd>
                                                <NumericInput className="w-full max-w-[80px]" min={0} value={m.leaveDays} disabled={!isEditMode} onChange={(n) => updateMember(idx, "leaveDays", n)} />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Public Holiday</dt>
                                            <dd>
                                                <NumericInput className="w-full max-w-[80px]" min={0} value={m.publicHolidayDays} disabled={!isEditMode} onChange={(n) => updateMember(idx, "publicHolidayDays", n)} />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Full Cap.</dt>
                                            <dd>
                                                <NumericInput className="w-full max-w-[80px]" min={0} value={m.fullCapacityPoints} disabled={!isEditMode} onChange={(n) => updateMember(idx, "fullCapacityPoints", n)} />
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Net Cap.</dt>
                                            <dd className={`font-bold ${m.currentCapacity < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                                {m.currentCapacity.toFixed(1)}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            ))}
                        </div>

                        {/* Desktop: table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Leave (Days)</TableHead>
                                        <TableHead>Public Holiday (Days)</TableHead>
                                        <TableHead>Full Capacity (Pts)</TableHead>
                                        <TableHead className="text-right">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="inline-flex items-center gap-1 cursor-help">
                                                        Net Capacity (Pts)
                                                        <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="max-w-xs">
                                                    <p>Net Capacity = Full Capacity - (Leave + PH) x 2 - Shared Overhead ({sharedOverheadTotal} pts)</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calculatedMembers.map((m, idx) => (
                                        <TableRow key={m.name}>
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                                                        {m.name.charAt(0)}
                                                    </div>
                                                    <span className="font-medium">{m.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={roleBadgeClass(m.role)}>
                                                    {m.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <NumericInput className="w-20" min={0} value={m.leaveDays} disabled={!isEditMode} onChange={(n) => updateMember(idx, "leaveDays", n)} />
                                            </TableCell>
                                            <TableCell>
                                                <NumericInput className="w-20" min={0} value={m.publicHolidayDays} disabled={!isEditMode} onChange={(n) => updateMember(idx, "publicHolidayDays", n)} />
                                            </TableCell>
                                            <TableCell>
                                                <NumericInput className="w-20" min={0} value={m.fullCapacityPoints} disabled={!isEditMode} onChange={(n) => updateMember(idx, "fullCapacityPoints", n)} />
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${m.currentCapacity < 10 ? 'text-red-500' : 'text-green-600'}`}>
                                                {m.currentCapacity.toFixed(1)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {isEditMode && (
                            <div className="mt-6 p-4 border rounded-lg bg-muted/50 flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
                                <div className="grid w-full sm:max-w-sm items-center gap-1.5">
                                    <Label htmlFor="new-name">New Member Name</Label>
                                    <Input id="new-name" placeholder="e.g. Alice" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
                                </div>
                                <div className="grid w-full sm:max-w-xs items-center gap-1.5">
                                    <Label htmlFor="new-role">Role</Label>
                                    <select
                                        id="new-role"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={newMemberRole}
                                        onChange={e => setNewMemberRole(e.target.value as Role)}
                                    >
                                        <option value="Engineer">Engineer</option>
                                        <option value="QA">QA</option>
                                    </select>
                                </div>
                                <Button variant="secondary" onClick={handleAddMember} className="min-h-[44px]">
                                    <Plus className="w-4 h-4 mr-2" /> Add Member
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Effort & Overhead + Summary Detail */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!isEditMode ? 'opacity-90' : ''}`}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Sprint Effort & Overhead</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-base border-b pb-2">Shared Team Overhead (Hours)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Meeting Hours (Team)</Label>
                                        <NumericInput value={leadEffortHours} disabled={!isEditMode} onChange={setLeadEffortHours} />
                                        <p className="text-xs text-muted-foreground mt-1">({leadEffortPoints} points)</p>
                                    </div>
                                    <div>
                                        <Label>Support Hours (Team)</Label>
                                        <NumericInput value={supportEffortHours} disabled={!isEditMode} onChange={setSupportEffortHours} />
                                        <p className="text-xs text-muted-foreground mt-1">({supportEffortPoints} points)</p>
                                    </div>
                                </div>
                                <div className="text-right text-sm font-bold">Total Shared Overhead: {sharedOverheadTotal} points</div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-base border-b pb-2">Role-Specific Effort (Points)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <Label>Release Effort</Label>
                                        <NumericInput value={releaseEffortPoints} disabled={!isEditMode} onChange={setReleaseEffortPoints} />
                                    </div>
                                    <div>
                                        <Label>Lead Effort</Label>
                                        <NumericInput value={leadEffortPointsInput} disabled={!isEditMode} onChange={setLeadEffortPointsInput} />
                                    </div>
                                    <div>
                                        <Label>Support Effort</Label>
                                        <NumericInput value={supportEffortPointsInput} disabled={!isEditMode} onChange={setSupportEffortPointsInput} />
                                    </div>
                                </div>
                                <div className="text-right text-sm font-bold">Total Role Effort: {roleEffortTotal} points</div>
                            </div>

                            <div className="bg-muted p-4 rounded-lg text-center">
                                <span className="font-bold text-lg">Total Team Effort: {teamEffortTotal} points</span>
                                <p className="text-xs text-muted-foreground">(Subtracted from Total Dev Capacity)</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Capacity Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>Sum Dev Net Capacity:</div>
                                <div className="text-right">{sumDevCurrentCapacity.toFixed(1)}</div>

                                <div>Minus Team Effort:</div>
                                <div className="text-right text-red-500">-{teamEffortTotal.toFixed(1)}</div>

                                <div className="font-bold border-t pt-2">Current Dev Capacity:</div>
                                <div className="text-right font-bold border-t pt-2">{currentDevCapacity.toFixed(1)}</div>

                                <div className="flex items-center gap-2">
                                    <span>Working Capacity (%):</span>
                                    <NumericInput className="w-16 h-6 px-1 text-right inline-block" value={devCapacityFactorPercent} disabled={!isEditMode} min={10} max={100} onChange={setDevCapacityFactorPercent} />
                                </div>
                                <div className="text-right text-primary font-bold">{minSprintCapacityDev.toFixed(1)}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm border-t pt-4">
                                <div>Sum QA Net Capacity:</div>
                                <div className="text-right">{sumQACurrentCapacity.toFixed(1)}</div>
                                <div className="flex items-center gap-2">
                                    <span>Working Capacity (%):</span>
                                    <NumericInput className="w-16 h-6 px-1 text-right inline-block" value={qaCapacityFactorPercent} disabled={!isEditMode} min={10} max={100} onChange={setQaCapacityFactorPercent} />
                                </div>
                                <div className="text-right text-primary font-bold">{minSprintCapacityQA.toFixed(1)}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Confirmation Dialog */}
                <Dialog open={showNewSprintDialog} onOpenChange={setShowNewSprintDialog}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Start Next Sprint?</DialogTitle>
                            <DialogDescription>
                                This will create a new sprint and copy your current team members. Leave days and public holidays will be reset to 0.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowNewSprintDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmNewSprint} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                {isSaving ? "Creating..." : "Start Sprint"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}

export default function CapacityPlanner() {
    return (
        <Suspense fallback={
            <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-10 w-[280px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                </div>
                <Skeleton className="h-64 rounded-xl" />
            </div>
        }>
            <CapacityPlannerContent />
        </Suspense>
    );
}
